import mongoose from 'mongoose';
import { Router } from 'express';
import YoutubePlaylist from '../models/YoutubePlaylist.js';
import YoutubeDailyGoal from '../models/YoutubeDailyGoal.js';
import YoutubeXpTransaction from '../models/YoutubeXpTransaction.js';
import { asyncRoute } from '../lib/asyncRoute.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);
const speeds = [1, 1.25, 1.5, 1.75, 2];

function parsePlaylistId(value) {
  try {
    const url = new URL(value);
    if (!['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com'].includes(url.hostname)) return null;
    return url.searchParams.get('list');
  } catch { return null; }
}

function durationSeconds(value = '') {
  const match = value.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  return match ? Number(match[1] || 0) * 3600 + Number(match[2] || 0) * 60 + Number(match[3] || 0) : 0;
}

async function youtubeGet(resource, params) {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    const error = new Error('YouTube is not connected yet. Add YOUTUBE_API_KEY to server/.env to import playlist details.');
    error.status = 503;
    throw error;
  }
  const url = new URL(`https://www.googleapis.com/youtube/v3/${resource}`);
  Object.entries({ ...params, key }).forEach(([name, value]) => url.searchParams.set(name, value));
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.error?.message || 'Could not load that YouTube playlist. Check the URL and API key.');
    error.status = response.status === 403 ? 502 : response.status;
    throw error;
  }
  return data;
}

async function loadPlaylist(playlistId) {
  const playlistData = await youtubeGet('playlists', { part: 'snippet', id: playlistId, maxResults: '1' });
  const playlist = playlistData.items?.[0];
  if (!playlist) {
    const error = new Error('That playlist was not found or is private.'); error.status = 404; throw error;
  }
  const items = [];
  let pageToken = '';
  do {
    const page = await youtubeGet('playlistItems', { part: 'snippet,contentDetails', playlistId, maxResults: '50', ...(pageToken ? { pageToken } : {}) });
    items.push(...(page.items || []));
    pageToken = page.nextPageToken || '';
  } while (pageToken && items.length < 500);
  const validItems = items.filter(item => item.snippet?.resourceId?.videoId);
  const videos = [];
  for (let offset = 0; offset < validItems.length; offset += 50) {
    const batch = validItems.slice(offset, offset + 50);
    const details = await youtubeGet('videos', { part: 'contentDetails,snippet', id: batch.map(item => item.snippet.resourceId.videoId).join(',') });
    const byId = new Map((details.items || []).map(video => [video.id, video]));
    for (const item of batch) {
      const id = item.snippet.resourceId.videoId;
      const video = byId.get(id);
      if (!video) continue;
      videos.push({ videoId: id, title: video.snippet.title, durationSeconds: durationSeconds(video.contentDetails.duration), thumbnail: video.snippet.thumbnails?.medium?.url || video.snippet.thumbnails?.default?.url || '' });
    }
  }
  return { playlistId, url: `https://www.youtube.com/playlist?list=${encodeURIComponent(playlistId)}`, title: playlist.snippet.title, channelTitle: playlist.snippet.channelTitle, videos };
}

function fallbackPlaylist(playlistId, title, lectureCount, averageDurationMinutes) {
  return { playlistId, url: `https://www.youtube.com/playlist?list=${encodeURIComponent(playlistId)}`, title: title.trim() || 'My YouTube playlist', channelTitle: 'Manual fallback plan', sourceMode: 'manual-fallback', videos: Array.from({ length: lectureCount }, (_, index) => ({ videoId: `manual-${index + 1}`, title: `Lecture ${index + 1}`, durationSeconds: averageDurationMinutes * 60, thumbnail: '' })) };
}

function plusDays(date, days) {
  const value = new Date(`${date}T12:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
function dateOffset(date, days) { return plusDays(date, days); }
function daysBetween(from, to) { return Math.max(0, Math.round((Date.parse(`${to}T12:00:00.000Z`) - Date.parse(`${from}T12:00:00.000Z`)) / 86400000)); }
function eachDay(start, count) { return Array.from({ length: count }, (_, index) => dateOffset(start, index)); }

async function dailyGoalSummary(userId, exam, date) {
  const [playlists, goals, transactions] = await Promise.all([
    YoutubePlaylist.find({ userId, exam }).select('videos').lean(),
    YoutubeDailyGoal.find({ userId, exam, date: { $lte: date } }).sort({ date: 1 }).lean(),
    YoutubeXpTransaction.find({ userId, exam }).select('points date').lean()
  ]);
  const doneByDate = new Map();
  const scheduledByDate = new Map();
  for (const playlist of playlists) for (const video of playlist.videos || []) {
    const day = video.studyDate || date;
    scheduledByDate.set(day, (scheduledByDate.get(day) || 0) + 1);
    if (video.done) doneByDate.set(day, (doneByDate.get(day) || 0) + 1);
  }
  const goalsByDate = new Map(goals.map(goal => [goal.date, goal.target]));
  const targetFor = day => goalsByDate.get(day) || 2;
  const completedToday = doneByDate.get(date) || 0;
  const completedTodayGoal = completedToday >= targetFor(date);
  let anchor = completedTodayGoal ? date : dateOffset(date, -1);
  let streak = 0;
  for (let i = 0; i < 3650; i += 1) {
    const goalDate = dateOffset(anchor, -i);
    if ((doneByDate.get(goalDate) || 0) < targetFor(goalDate)) break;
    streak += 1;
  }
  const totalXp = transactions.reduce((sum, item) => sum + item.points, 0);
  const todayXp = transactions.filter(item => item.date === date).reduce((sum, item) => sum + item.points, 0);
  const completedAll = [...doneByDate.values()].reduce((sum, value) => sum + value, 0);
  const plannedAll = [...scheduledByDate.values()].reduce((sum, value) => sum + value, 0);
  const xpByDate = new Map();
  for (const item of transactions) xpByDate.set(item.date, (xpByDate.get(item.date) || 0) + item.points);
  const utcDate = new Date(`${date}T12:00:00.000Z`);
  const mondayOffset = (utcDate.getUTCDay() + 6) % 7;
  const weekStart = dateOffset(date, -mondayOffset);
  const weeklyDates = eachDay(weekStart, 7);
  const monthStart = `${date.slice(0, 7)}-01`;
  const daysInMonth = new Date(Date.UTC(utcDate.getUTCFullYear(), utcDate.getUTCMonth() + 1, 0)).getUTCDate();
  const monthDates = eachDay(monthStart, daysInMonth);
  const countFor = (map, day) => map.get(day) || 0;
  const weekly = {
    goal: weeklyDates.reduce((sum, day) => sum + targetFor(day), 0),
    completed: weeklyDates.reduce((sum, day) => sum + countFor(doneByDate, day), 0),
    planned: weeklyDates.reduce((sum, day) => sum + countFor(scheduledByDate, day), 0),
    missed: weeklyDates.filter(day => day < date && countFor(scheduledByDate, day) > countFor(doneByDate, day)).reduce((sum, day) => sum + countFor(scheduledByDate, day) - countFor(doneByDate, day), 0),
    xp: weeklyDates.reduce((sum, day) => sum + countFor(xpByDate, day), 0),
    days: weeklyDates.map(day => ({ date: day, completed: countFor(doneByDate, day), goal: targetFor(day), xp: countFor(xpByDate, day) }))
  };
  weekly.percentage = weekly.goal ? Math.round(weekly.completed / weekly.goal * 100) : 0;
  weekly.averagePerDay = Math.round(weekly.completed / Math.max(1, Math.min(7, daysBetween(weekStart, date) + 1)) * 10) / 10;
  const monthly = {
    goal: monthDates.reduce((sum, day) => sum + targetFor(day), 0),
    completed: monthDates.reduce((sum, day) => sum + countFor(doneByDate, day), 0),
    xp: monthDates.reduce((sum, day) => sum + countFor(xpByDate, day), 0),
    studyDays: monthDates.filter(day => countFor(doneByDate, day) > 0).length,
    missedDays: monthDates.filter(day => day < date && countFor(doneByDate, day) < targetFor(day)).length,
    weeks: []
  };
  for (let offset = 0; offset < daysInMonth; offset += 7) {
    const days = monthDates.slice(offset, offset + 7).filter(day => day <= date);
    const goalCount = days.reduce((sum, day) => sum + targetFor(day), 0);
    const completedCount = days.reduce((sum, day) => sum + countFor(doneByDate, day), 0);
    monthly.weeks.push({ label: `Week ${Math.floor(offset / 7) + 1}`, completed: completedCount, goal: goalCount, percentage: goalCount ? Math.round(completedCount / goalCount * 100) : 0 });
  }
  monthly.percentage = monthly.goal ? Math.round(monthly.completed / monthly.goal * 100) : 0;
  monthly.averagePerDay = Math.round(monthly.completed / Math.max(1, Number(date.slice(8, 10))) * 10) / 10;
  const yesterday = dateOffset(date, -1);
  const yesterdayDone = countFor(doneByDate, yesterday);
  const yesterdayGoal = targetFor(yesterday);
  const dailyDifference = Math.round((completedToday / Math.max(1, targetFor(date)) - yesterdayDone / Math.max(1, yesterdayGoal)) * 100);
  let longestStreak = 0; let run = 0;
  for (const day of eachDay(dateOffset(date, -3649), 3650)) {
    if (countFor(doneByDate, day) >= targetFor(day)) { run += 1; longestStreak = Math.max(longestStreak, run); }
    else run = 0;
  }
  const badges = [
    { id: 'first-lecture', label: 'First lecture', earned: completedAll >= 1 },
    { id: 'seven-day-streak', label: '7 day streak', earned: longestStreak >= 7 },
    { id: 'thirty-day-streak', label: '30 day streak', earned: longestStreak >= 30 },
    { id: 'hundred-lectures', label: '100 lectures', earned: completedAll >= 100 },
    { id: 'weekly-champion', label: 'Weekly champion', earned: weekly.completed >= weekly.goal },
    { id: 'goal-crusher', label: 'Goal crusher', earned: completedTodayGoal }
  ];
  return { date, target: targetFor(date), completed: completedToday, scheduled: countFor(scheduledByDate, date), completedTodayGoal, streak, longestStreak, totalXp, todayXp, level: Math.floor(totalXp / 100) + 1, xpIntoLevel: totalXp % 100, xpToNextLevel: 100 - (totalXp % 100), overall: { completed: completedAll, planned: plannedAll, percentage: plannedAll ? Math.round(completedAll / plannedAll * 100) : 0 }, comparison: { yesterday: yesterdayDone, yesterdayGoal, yesterdayPercentage: Math.round(yesterdayDone / Math.max(1, yesterdayGoal) * 100), todayPercentage: Math.round(completedToday / Math.max(1, targetFor(date)) * 100), difference: dailyDifference }, weekly, monthly, badges };
}

async function awardXpOnce(userId, exam, sourceKey, reason, points, date) {
  try {
    await YoutubeXpTransaction.updateOne({ userId, exam, sourceKey }, { $setOnInsert: { userId, exam, sourceKey, reason, points, date } }, { upsert: true });
  } catch (error) {
    if (error?.code !== 11000) throw error;
  }
}

async function awardGoalMilestones(userId, exam, date) {
  const summary = await dailyGoalSummary(userId, exam, date);
  if (summary.completedTodayGoal) {
    await awardXpOnce(userId, exam, `daily-goal:${date}`, 'daily-goal', 25, date);
    if (summary.streak >= 7) await awardXpOnce(userId, exam, `seven-day-streak:${date}`, 'seven-day-streak', 50, date);
  }
  if (summary.weekly.completed >= summary.weekly.goal) {
    const day = new Date(`${date}T12:00:00.000Z`);
    const start = dateOffset(date, -((day.getUTCDay() + 6) % 7));
    await awardXpOnce(userId, exam, `weekly-goal:${start}`, 'weekly-goal', 50, date);
  }
}

function expectedEndDate(videos, fallbackDate) {
  return videos.filter(video => !video.done).map(video => video.studyDate).filter(Boolean).sort().at(-1) || fallbackDate;
}

function cleanPlaylist(playlist) {
  const data = playlist.toObject ? playlist.toObject() : playlist;
  const videos = data.videos || [];
  return { id: String(data._id), playlistId: data.playlistId, url: data.url, title: data.title, channelTitle: data.channelTitle, videos, startLecture: data.startLecture, endLecture: data.endLecture, speed: data.speed, studyDate: data.studyDate, lecturesPerDay: data.lecturesPerDay || 2, expectedCompletionDate: data.expectedCompletionDate || expectedEndDate(videos, data.studyDate), sourceMode: data.sourceMode || 'youtube-api', isPaused: Boolean(data.isPaused), pausedAt: data.pausedAt || '', remainingLectures: videos.filter(video => !video.done).length };
}

router.get('/', asyncRoute(async (req, res) => {
  const playlists = await YoutubePlaylist.find({ userId: req.user._id, exam: req.user.exam }).sort({ studyDate: 1, createdAt: -1 }).lean();
  res.json({ playlists: playlists.map(cleanPlaylist), youtubeConfigured: Boolean(process.env.YOUTUBE_API_KEY) });
}));

router.get('/goal', asyncRoute(async (req, res) => {
  const date = String(req.query.date || '');
  if (!validDate(date)) return res.status(400).json({ error: 'Choose a valid date to load the lecture goal.' });
  res.json(await dailyGoalSummary(req.user._id, req.user.exam, date));
}));

router.put('/goal', asyncRoute(async (req, res) => {
  const date = String(req.body?.date || '');
  const target = Number(req.body?.target);
  if (!validDate(date)) return res.status(400).json({ error: 'Choose a valid date for your lecture goal.' });
  if (!Number.isInteger(target) || target < 1 || target > 50) return res.status(400).json({ error: 'Set a daily lecture goal between 1 and 50.' });
  await YoutubeDailyGoal.findOneAndUpdate({ userId: req.user._id, exam: req.user.exam, date }, { $set: { target } }, { upsert: true, new: true, runValidators: true });
  await awardGoalMilestones(req.user._id, req.user.exam, date);
  res.json(await dailyGoalSummary(req.user._id, req.user.exam, date));
}));

router.post('/', asyncRoute(async (req, res) => {
  if (!req.user.exam) return res.status(409).json({ error: 'Choose your exam before scheduling lectures.' });
  const playlistId = parsePlaylistId(String(req.body?.url || '').trim());
  if (!playlistId || playlistId.length > 100) return res.status(400).json({ error: 'Paste a valid YouTube playlist URL.' });
  const existing = await YoutubePlaylist.findOne({ userId: req.user._id, exam: req.user.exam, playlistId });
  if (existing) return res.status(409).json({ error: 'This playlist is already in your study schedule.' });
  const studyDate = String(req.body?.studyDate || '');
  if (!validDate(studyDate)) return res.status(400).json({ error: 'Choose a valid study date.' });
  const lecturesPerDay = Number(req.body?.lecturesPerDay || 2);
  if (!Number.isInteger(lecturesPerDay) || lecturesPerDay < 1 || lecturesPerDay > 50) return res.status(400).json({ error: 'Choose between 1 and 50 lectures per day.' });
  let info;
  if (process.env.YOUTUBE_API_KEY) info = await loadPlaylist(playlistId);
  else {
    const lectureCount = Number(req.body?.lectureCount);
    const averageDurationMinutes = Number(req.body?.averageDurationMinutes || 30);
    if (!Number.isInteger(lectureCount) || lectureCount < 1 || lectureCount > 500) return res.status(400).json({ error: 'YouTube API is not configured. For fallback mode, enter the playlist lecture count (1–500).' });
    if (!Number.isFinite(averageDurationMinutes) || averageDurationMinutes < 1 || averageDurationMinutes > 360) return res.status(400).json({ error: 'Enter an estimated lecture length from 1 to 360 minutes.' });
    info = fallbackPlaylist(playlistId, String(req.body?.title || ''), lectureCount, averageDurationMinutes);
  }
  if (!info.videos.length) return res.status(422).json({ error: 'No playable videos were found in this playlist.' });
  const videos = info.videos.map((video, index) => ({ ...video, studyDate: plusDays(studyDate, Math.floor(index / lecturesPerDay)), done: false }));
  const expectedCompletionDate = plusDays(studyDate, Math.ceil(videos.length / lecturesPerDay) - 1);
  const playlist = await YoutubePlaylist.create({ ...info, videos, userId: req.user._id, exam: req.user.exam, startLecture: 1, endLecture: info.videos.length, speed: 1, lecturesPerDay, expectedCompletionDate, studyDate });
  res.status(201).json({ playlist: cleanPlaylist(playlist) });
}));

router.patch('/:playlistId', asyncRoute(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.playlistId)) return res.status(404).json({ error: 'Scheduled playlist not found.' });
  const playlist = await YoutubePlaylist.findOne({ _id: req.params.playlistId, userId: req.user._id, exam: req.user.exam });
  if (!playlist) return res.status(404).json({ error: 'Scheduled playlist not found.' });
  const startLecture = Number(req.body?.startLecture);
  const endLecture = Number(req.body?.endLecture);
  const speed = Number(req.body?.speed);
  const studyDate = String(req.body?.studyDate || playlist.studyDate);
  const lecturesPerDay = Number(req.body?.lecturesPerDay ?? playlist.lecturesPerDay ?? 2);
  const today = String(req.body?.today || studyDate);
  if (!Number.isInteger(startLecture) || !Number.isInteger(endLecture) || startLecture < 1 || endLecture < startLecture || endLecture > playlist.videos.length) return res.status(400).json({ error: `Lecture range must be between 1 and ${playlist.videos.length}.` });
  if (!speeds.includes(speed)) return res.status(400).json({ error: 'Choose a supported playback speed.' });
  if (!validDate(studyDate)) return res.status(400).json({ error: 'Choose a valid study date.' });
  if (!validDate(today)) return res.status(400).json({ error: 'Choose a valid date for your updated plan.' });
  if (!Number.isInteger(lecturesPerDay) || lecturesPerDay < 1 || lecturesPerDay > 50) return res.status(400).json({ error: 'Choose between 1 and 50 lectures per day.' });
  const rescheduleFrom = (lecturesPerDay !== playlist.lecturesPerDay || studyDate !== playlist.studyDate) && studyDate < today ? today : studyDate;
  if (lecturesPerDay !== playlist.lecturesPerDay || studyDate !== playlist.studyDate) {
    let nextLecture = 0;
    playlist.videos.forEach(video => { if (!video.done) { video.studyDate = plusDays(rescheduleFrom, Math.floor(nextLecture / lecturesPerDay)); nextLecture += 1; } });
  }
  playlist.set({ startLecture, endLecture, speed, lecturesPerDay, studyDate, expectedCompletionDate: expectedEndDate(playlist.videos, rescheduleFrom) });
  await playlist.save();
  res.json({ playlist: cleanPlaylist(playlist) });
}));

router.patch('/:playlistId/status', asyncRoute(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.playlistId)) return res.status(404).json({ error: 'Study plan not found.' });
  if (typeof req.body?.isPaused !== 'boolean') return res.status(400).json({ error: 'Plan status must be paused or active.' });
  const today = String(req.body?.today || '');
  if (!validDate(today)) return res.status(400).json({ error: 'Choose a valid date to update this plan.' });
  const playlist = await YoutubePlaylist.findOne({ _id: req.params.playlistId, userId: req.user._id, exam: req.user.exam });
  if (!playlist) return res.status(404).json({ error: 'Study plan not found.' });
  if (req.body.isPaused && !playlist.isPaused) { playlist.isPaused = true; playlist.pausedAt = today; }
  else if (!req.body.isPaused && playlist.isPaused) {
    const daysPaused = playlist.pausedAt ? daysBetween(playlist.pausedAt, today) : 0;
    if (daysPaused) playlist.videos.forEach(video => { if (!video.done && video.studyDate) video.studyDate = plusDays(video.studyDate, daysPaused); });
    playlist.isPaused = false; playlist.pausedAt = '';
    playlist.expectedCompletionDate = expectedEndDate(playlist.videos, today);
  }
  await playlist.save();
  res.json({ playlist: cleanPlaylist(playlist) });
}));

router.post('/:playlistId/reschedule-missed', asyncRoute(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.playlistId)) return res.status(404).json({ error: 'Study plan not found.' });
  const today = String(req.body?.today || '');
  if (!validDate(today)) return res.status(400).json({ error: 'Choose a valid reschedule date.' });
  const playlist = await YoutubePlaylist.findOne({ _id: req.params.playlistId, userId: req.user._id, exam: req.user.exam });
  if (!playlist) return res.status(404).json({ error: 'Study plan not found.' });
  if (playlist.isPaused) return res.status(409).json({ error: 'Resume this study plan before rescheduling missed lectures.' });
  let nextLecture = 0;
  for (const video of playlist.videos) if (!video.done && video.studyDate < today) { video.studyDate = plusDays(today, Math.floor(nextLecture / playlist.lecturesPerDay)); nextLecture += 1; }
  playlist.expectedCompletionDate = expectedEndDate(playlist.videos, today);
  await playlist.save();
  res.json({ playlist: cleanPlaylist(playlist), rescheduledLectures: nextLecture });
}));

router.patch('/:playlistId/lectures/:videoId', asyncRoute(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.playlistId)) return res.status(404).json({ error: 'Scheduled playlist not found.' });
  const playlist = await YoutubePlaylist.findOne({ _id: req.params.playlistId, userId: req.user._id, exam: req.user.exam });
  if (!playlist) return res.status(404).json({ error: 'Scheduled playlist not found.' });
  const video = playlist.videos.find(item => item.videoId === req.params.videoId);
  if (!video) return res.status(404).json({ error: 'Lecture not found in this playlist.' });
  const wasDone = video.done;
  if (typeof req.body?.done === 'boolean') video.done = req.body.done;
  if (req.body?.studyDate !== undefined) {
    const date = String(req.body.studyDate);
    if (!validDate(date)) return res.status(400).json({ error: 'Choose a valid lecture date.' });
    video.studyDate = date;
  }
  await playlist.save();
  const earnedOn = video.studyDate || playlist.studyDate;
  if (!wasDone && video.done) await awardXpOnce(req.user._id, req.user.exam, `lecture:${playlist.playlistId}:${video.videoId}`, 'lecture', 10, earnedOn);
  if (video.done) await awardGoalMilestones(req.user._id, req.user.exam, earnedOn);
  playlist.expectedCompletionDate = expectedEndDate(playlist.videos, playlist.studyDate);
  await playlist.save();
  res.json({ playlist: cleanPlaylist(playlist) });
}));

router.delete('/:playlistId', asyncRoute(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.playlistId)) return res.status(404).json({ error: 'Scheduled playlist not found.' });
  const result = await YoutubePlaylist.findOneAndDelete({ _id: req.params.playlistId, userId: req.user._id, exam: req.user.exam });
  if (!result) return res.status(404).json({ error: 'Scheduled playlist not found.' });
  res.status(204).end();
}));

export default router;
