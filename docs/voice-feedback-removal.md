# Voice feedback removed

The application now supports text feedback only. The recording/player/demo components,
student assignment voice reads, and the voice Firestore service have been removed.
The feedback API rejects legacy voice uploads with HTTP 410 before account/database reads.
The voice DELETE endpoint has been removed. Text feedback authorization, conflict checking,
and local UI updates after saving remain in place.

Historical voice documents and audio files have NOT been deleted. Existing Firebase rules
have not been modified or deployed; removal of the feature does not revoke access to old
audio URLs or old clients using existing rules. Any data cleanup or access-policy change
must be reviewed separately. Deploy the application to apply these code changes.

Older voice setup guides in this repository are historical and no longer describe a
supported feature. Do not use them to re-enable voice uploads.

Regression check: `node scripts/test-firebase-quota.cjs`.