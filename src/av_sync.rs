// Audio-Video Synchronization Module
// Provides unified timestamp management and synchronization mechanisms

use std::sync::{Arc, Mutex};
use std::time::Instant;

lazy_static::lazy_static! {
    /// Global AV synchronization clock - shared reference time for audio and video
    static ref AV_SYNC_CLOCK: Arc<Mutex<Option<Instant>>> = Arc::new(Mutex::new(None));

    /// Global AV synchronization controller - shared between audio and video handlers
    static ref AV_SYNC_CONTROLLER: Arc<AVSyncController> = Arc::new(AVSyncController::new(100));
}

/// Initialize or reset the AV synchronization clock
pub fn init_av_clock() {
    *AV_SYNC_CLOCK.lock().unwrap() = Some(Instant::now());
}

/// Get the current timestamp in milliseconds since AV clock initialization
/// Returns None if clock hasn't been initialized
pub fn get_av_timestamp_ms() -> Option<i64> {
    AV_SYNC_CLOCK.lock().unwrap().as_ref().map(|start| {
        let elapsed = start.elapsed();
        (elapsed.as_secs() * 1000 + elapsed.subsec_millis() as u64) as i64
    })
}

/// Get the AV clock start instant
pub fn get_av_clock_start() -> Option<Instant> {
    *AV_SYNC_CLOCK.lock().unwrap()
}

/// Reset the AV synchronization clock
pub fn reset_av_clock() {
    *AV_SYNC_CLOCK.lock().unwrap() = None;
}

/// Get the global AV synchronization controller
pub fn get_av_sync_controller() -> Arc<AVSyncController> {
    AV_SYNC_CONTROLLER.clone()
}

/// Update video PTS in the global controller
pub fn update_video_pts(pts: i64) {
    AV_SYNC_CONTROLLER.update_video_pts(pts);
}

/// Update audio PTS in the global controller
pub fn update_audio_pts(pts: i64) {
    AV_SYNC_CONTROLLER.update_audio_pts(pts);
}

/// Get current AV drift from the global controller
pub fn get_av_drift() -> Option<i64> {
    AV_SYNC_CONTROLLER.get_av_drift()
}

/// Check if AV is synchronized
pub fn is_av_synchronized() -> bool {
    AV_SYNC_CONTROLLER.is_synchronized()
}

/// Reset the global AV sync controller
pub fn reset_av_sync() {
    AV_SYNC_CONTROLLER.reset();
}

/// AV Sync Controller - manages synchronization between audio and video streams
pub struct AVSyncController {
    /// Last video PTS received
    last_video_pts: Arc<Mutex<Option<i64>>>,
    /// Last audio PTS received
    last_audio_pts: Arc<Mutex<Option<i64>>>,
    /// Maximum acceptable drift in milliseconds
    max_drift_ms: i64,
}

impl AVSyncController {
    pub fn new(max_drift_ms: i64) -> Self {
        Self {
            last_video_pts: Arc::new(Mutex::new(None)),
            last_audio_pts: Arc::new(Mutex::new(None)),
            max_drift_ms,
        }
    }

    /// Update the last video PTS
    pub fn update_video_pts(&self, pts: i64) {
        *self.last_video_pts.lock().unwrap() = Some(pts);
    }

    /// Update the last audio PTS
    pub fn update_audio_pts(&self, pts: i64) {
        *self.last_audio_pts.lock().unwrap() = Some(pts);
    }

    /// Get the current AV drift in milliseconds
    /// Positive value means audio is ahead of video
    /// Negative value means video is ahead of audio
    pub fn get_av_drift(&self) -> Option<i64> {
        let video_pts = *self.last_video_pts.lock().unwrap();
        let audio_pts = *self.last_audio_pts.lock().unwrap();
        
        match (audio_pts, video_pts) {
            (Some(a), Some(v)) => Some(a - v),
            _ => None,
        }
    }

    /// Check if audio/video are synchronized within acceptable drift
    pub fn is_synchronized(&self) -> bool {
        if let Some(drift) = self.get_av_drift() {
            drift.abs() <= self.max_drift_ms
        } else {
            true // No data yet, consider synchronized
        }
    }

    /// Get adjustment recommendation for audio playback
    /// Returns:
    /// - Positive: slow down audio (audio is ahead)
    /// - Negative: speed up audio (audio is behind)
    /// - Zero: no adjustment needed
    pub fn get_audio_adjustment(&self) -> i64 {
        if let Some(drift) = self.get_av_drift() {
            if drift.abs() > self.max_drift_ms {
                // Return adjustment in milliseconds
                drift
            } else {
                0
            }
        } else {
            0
        }
    }

    /// Reset synchronization state
    pub fn reset(&self) {
        *self.last_video_pts.lock().unwrap() = None;
        *self.last_audio_pts.lock().unwrap() = None;
    }
}

impl Default for AVSyncController {
    fn default() -> Self {
        // Default max drift: 100ms
        Self::new(100)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_av_clock() {
        init_av_clock();
        let ts1 = get_av_timestamp_ms();
        assert!(ts1.is_some());
        assert!(ts1.unwrap() >= 0);
        
        std::thread::sleep(std::time::Duration::from_millis(10));
        let ts2 = get_av_timestamp_ms();
        assert!(ts2.unwrap() > ts1.unwrap());
        
        reset_av_clock();
        assert!(get_av_timestamp_ms().is_none());
    }

    #[test]
    fn test_av_sync_controller() {
        let controller = AVSyncController::new(50);
        
        // No data yet
        assert!(controller.is_synchronized());
        assert_eq!(controller.get_av_drift(), None);
        
        // Update video and audio
        controller.update_video_pts(1000);
        controller.update_audio_pts(1020);
        
        // Audio is 20ms ahead
        assert_eq!(controller.get_av_drift(), Some(20));
        assert!(controller.is_synchronized()); // Within 50ms tolerance
        
        // Large drift
        controller.update_audio_pts(1200);
        assert_eq!(controller.get_av_drift(), Some(200));
        assert!(!controller.is_synchronized());
    }
}

