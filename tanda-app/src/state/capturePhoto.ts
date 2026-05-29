let latestCapturedPhotoUri = '';
let latestUploadedPhotoUrl = '';
let latestAttendanceRecordId = '';
let latestSavedAt = '';

export function setLatestCapturedPhotoUri(uri: string) {
  latestCapturedPhotoUri = uri;
}

export function getLatestCapturedPhotoUri() {
  return latestCapturedPhotoUri;
}

export function setLatestUploadData(data: { photoUrl: string; attendanceRecordId: string; savedAt: string }) {
  latestUploadedPhotoUrl = data.photoUrl;
  latestAttendanceRecordId = data.attendanceRecordId;
  latestSavedAt = data.savedAt;
}

export function getLatestUploadData() {
  return {
    photoUrl: latestUploadedPhotoUrl,
    attendanceRecordId: latestAttendanceRecordId,
    savedAt: latestSavedAt,
  };
}
