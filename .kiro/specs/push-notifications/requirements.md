# Requirements Document

## Introduction

Healway is a full-stack healthcare platform with three user roles: admin, doctor, and patient. The push notification feature uses Firebase Cloud Messaging (FCM) to deliver real-time web push notifications to users across all three roles — even when the browser tab is not in focus or the app is closed.

The infrastructure is partially in place: the backend has `firebaseAdminService.js`, `pushNotificationHelper.js`, `fcmTokenController.js`, and `notificationService.js` (which already calls push on every `createNotification`). The frontend has `pushNotificationService.js`, `firebase.js`, and `firebase-messaging-sw.js`. However, the real Firebase credentials are not yet wired in, the Admin model lacks FCM token support, the service worker uses dummy credentials, and the `unregisterFCMToken` function is never called on logout.

This document captures the requirements to complete and harden the feature end-to-end.

---

## Glossary

- **FCM**: Firebase Cloud Messaging — Google's cross-platform messaging service used to deliver push notifications.
- **FCM_Token**: A unique string issued by Firebase that identifies a specific browser/device for push delivery.
- **VAPID_Key**: Voluntary Application Server Identification key used to authenticate the web push subscription with FCM.
- **Service_Worker**: The `firebase-messaging-sw.js` background script that receives push messages when the app is not in focus.
- **Push_Notification_Service**: The frontend module `pushNotificationService.js` responsible for permission requests, token registration, and foreground message handling.
- **Firebase_Admin_Service**: The backend module `firebaseAdminService.js` that initialises the Firebase Admin SDK and sends multicast push messages.
- **Push_Notification_Helper**: The backend utility `pushNotificationHelper.js` that resolves a user's FCM tokens from the database and delegates to Firebase_Admin_Service.
- **Notification_Service**: The backend service `notificationService.js` that creates in-app notifications and triggers push delivery.
- **FCM_Token_Controller**: The backend controller `fcmTokenController.js` that handles save, remove, and test token API endpoints.
- **Notification_Context**: The frontend React context `NotificationContext.jsx` that manages in-app notification state and Socket.IO events.
- **Patient**: An authenticated user with role `patient`.
- **Doctor**: An authenticated user with role `doctor`.
- **Admin**: An authenticated user with role `admin`.
- **Background_Message**: A push notification delivered by the Service_Worker when the browser tab is not active.
- **Foreground_Message**: A push notification received while the app tab is open and active.
- **Notification_Permission**: The browser-level permission (`granted` / `denied` / `default`) that controls whether push notifications can be shown.

---

## Requirements

### Requirement 1: Firebase Credentials Configuration

**User Story:** As a developer, I want real Firebase credentials wired into both the frontend and backend environments, so that FCM push notifications are actually delivered instead of silently failing with dummy values.

#### Acceptance Criteria

1. THE Frontend SHALL read Firebase configuration exclusively from the environment variables `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_MEASUREMENT_ID`, and `VITE_FIREBASE_VAPID_KEY`.
2. THE Backend SHALL read the Firebase Admin service account from the environment variable `FIREBASE_SERVICE_ACCOUNT` as a JSON string.
3. WHEN the `FIREBASE_SERVICE_ACCOUNT` environment variable is absent or contains invalid JSON, THE Firebase_Admin_Service SHALL log a warning and disable push delivery without throwing an unhandled exception.
4. WHEN the `VITE_FIREBASE_VAPID_KEY` environment variable is absent, THE Push_Notification_Service SHALL log a warning and skip FCM token retrieval without throwing an unhandled exception.
5. THE Service_Worker SHALL be configured with the real Firebase project credentials matching the values in `frontend/.env`.

---

### Requirement 2: FCM Token Lifecycle — Patient and Doctor

**User Story:** As a patient or doctor, I want my browser to be registered for push notifications after I log in and deregistered when I log out, so that I only receive notifications on devices where I am actively signed in.

#### Acceptance Criteria

1. WHEN a Patient successfully authenticates, THE Push_Notification_Service SHALL request Notification_Permission from the browser and, if granted, obtain an FCM_Token and register it with the backend via `POST /api/patients/fcm-tokens/save`.
2. WHEN a Doctor successfully authenticates, THE Push_Notification_Service SHALL request Notification_Permission from the browser and, if granted, obtain an FCM_Token and register it with the backend via `POST /api/doctors/fcm-tokens/save`.
3. WHEN Notification_Permission is `denied`, THE Push_Notification_Service SHALL skip token registration and SHALL NOT display an error to the user.
4. WHEN a Patient logs out, THE Push_Notification_Service SHALL call `DELETE /api/patients/fcm-tokens/remove` with the cached FCM_Token and remove the token from `localStorage`.
5. WHEN a Doctor logs out, THE Push_Notification_Service SHALL call `DELETE /api/doctors/fcm-tokens/remove` with the cached FCM_Token and remove the token from `localStorage`.
6. THE FCM_Token_Controller SHALL store up to 10 web FCM tokens per user, discarding the oldest when the limit is exceeded.
7. IF a token save or remove API call fails, THEN THE Push_Notification_Service SHALL log the error and continue without blocking the login or logout flow.

---

### Requirement 3: FCM Token Lifecycle — Admin

**User Story:** As an admin, I want to receive push notifications in my browser, so that I am alerted to critical events such as withdrawal requests and new doctor registrations even when I am not actively watching the dashboard.

#### Acceptance Criteria

1. THE Admin model SHALL include `fcmTokens` (array of strings, web browser tokens) and `fcmTokenMobile` (array of strings, mobile tokens) fields with empty array defaults.
2. THE Backend SHALL expose `POST /api/admin/fcm-tokens/save` and `DELETE /api/admin/fcm-tokens/remove` endpoints protected by admin authentication.
3. WHEN an Admin successfully authenticates, THE Push_Notification_Service SHALL request Notification_Permission and, if granted, register the FCM_Token with the backend via `POST /api/admin/fcm-tokens/save`.
4. WHEN an Admin logs out, THE Push_Notification_Service SHALL remove the FCM_Token via `DELETE /api/admin/fcm-tokens/remove`.
5. THE Push_Notification_Helper SHALL resolve admin FCM tokens from the Admin model and deliver push notifications to admins using the same multicast mechanism used for patients and doctors.

---

### Requirement 4: Background Push Notification Delivery

**User Story:** As a user (patient, doctor, or admin), I want to receive push notifications in my browser even when the Healway tab is closed or in the background, so that I am informed of important events without having to keep the app open.

#### Acceptance Criteria

1. WHEN the Service_Worker receives a Background_Message from FCM, THE Service_Worker SHALL display a browser notification with the title and body from `payload.notification`.
2. WHEN a background notification is displayed and the user clicks it, THE Service_Worker SHALL open or focus the Healway browser tab and navigate to the URL specified in `payload.data.link`, defaulting to `/` if no link is provided.
3. THE Service_Worker SHALL use the real Firebase project credentials (not dummy values) so that background message delivery functions correctly.
4. IF the Service_Worker fails to initialise Firebase (e.g., due to a network error), THEN THE Service_Worker SHALL log the error and continue without crashing.

---

### Requirement 5: Foreground Push Notification Handling

**User Story:** As a user with the Healway tab open, I want to see a notification when a push message arrives, so that I am not silently missed even while actively using the app.

#### Acceptance Criteria

1. WHEN a Foreground_Message is received and Notification_Permission is `granted`, THE Push_Notification_Service SHALL display a browser `Notification` object with the title and body from the FCM payload.
2. WHEN a Foreground_Message is received, THE Notification_Context SHALL increment the unread notification count without requiring a page reload.
3. IF the browser blocks `new Notification()` in the current context, THEN THE Push_Notification_Service SHALL catch the error, log a warning, and continue without throwing.

---

### Requirement 6: Notification Triggers — Appointment Events

**User Story:** As a patient or doctor, I want to receive a push notification for appointment lifecycle events, so that I am immediately aware of bookings, cancellations, and queue updates.

#### Acceptance Criteria

1. WHEN an appointment is created, THE Notification_Service SHALL send a push notification to the relevant Doctor and Patient.
2. WHEN an appointment is cancelled, THE Notification_Service SHALL send a push notification to the affected Patient.
3. WHEN an appointment is rescheduled, THE Notification_Service SHALL send a push notification to the relevant Doctor and Patient.
4. WHEN a patient's token is called in the queue, THE Notification_Service SHALL send a push notification to that Patient with priority `urgent`.
5. WHEN a patient's token is recalled, THE Notification_Service SHALL send a push notification to that Patient.
6. WHEN an appointment is marked as completed, THE Notification_Service SHALL send a push notification to the Patient.
7. WHEN payment for an appointment is confirmed, THE Notification_Service SHALL send a push notification to the Patient.

---

### Requirement 7: Notification Triggers — Prescription Events

**User Story:** As a patient, I want to receive a push notification when a prescription is issued, so that I can review my medication details promptly.

#### Acceptance Criteria

1. WHEN a prescription is created for a Patient, THE Notification_Service SHALL send a push notification to that Patient with priority `high`.
2. THE push notification body SHALL include the prescribing doctor's name.

---

### Requirement 8: Notification Triggers — Wallet and Withdrawal Events

**User Story:** As a doctor or admin, I want to receive push notifications for wallet and withdrawal events, so that I am aware of financial activity without polling the dashboard.

#### Acceptance Criteria

1. WHEN a wallet credit event occurs for a Doctor, THE Notification_Service SHALL send a push notification to that Doctor.
2. WHEN a Doctor submits a withdrawal request, THE Notification_Service SHALL send a push notification to all active Admins.
3. WHEN a withdrawal request is approved, rejected, or paid, THE Notification_Service SHALL send a push notification to the relevant Doctor.

---

### Requirement 9: Notification Triggers — Support Ticket Events

**User Story:** As a patient or doctor, I want to receive a push notification when an admin responds to my support ticket, so that I can follow up without repeatedly checking the support page.

#### Acceptance Criteria

1. WHEN an admin responds to a support ticket, THE Notification_Service SHALL send a push notification to the ticket owner (Patient or Doctor).
2. WHEN a support ticket status changes, THE Notification_Service SHALL send a push notification to the ticket owner.

---

### Requirement 10: Stale Token Cleanup

**User Story:** As a system operator, I want invalid or expired FCM tokens to be removed automatically, so that push delivery does not waste resources on dead registrations.

#### Acceptance Criteria

1. WHEN Firebase_Admin_Service receives a multicast response indicating one or more token failures, THE Firebase_Admin_Service SHALL log each failed token with its error message.
2. WHEN a token failure error code is `messaging/registration-token-not-registered` or `messaging/invalid-registration-token`, THE Firebase_Admin_Service SHALL remove that token from the user's `fcmTokens` or `fcmTokenMobile` array in the database.
3. THE stale token removal SHALL be performed asynchronously and SHALL NOT block the push notification send operation.

---

### Requirement 11: Test Push Notification Endpoint

**User Story:** As a developer or admin, I want a test endpoint that sends a push notification to my own registered devices, so that I can verify the end-to-end push pipeline without triggering real application events.

#### Acceptance Criteria

1. THE Backend SHALL expose `POST /api/patients/fcm-tokens/test`, `POST /api/doctors/fcm-tokens/test`, and `POST /api/admin/fcm-tokens/test` endpoints, each protected by the respective role's authentication middleware.
2. WHEN the test endpoint is called and the user has at least one registered FCM_Token, THE FCM_Token_Controller SHALL send a test push notification to all of the user's registered tokens.
3. WHEN the test endpoint is called and the user has no registered FCM tokens, THE FCM_Token_Controller SHALL return a response indicating that no tokens are registered.
4. IF the push send fails, THEN THE FCM_Token_Controller SHALL return an error response with the failure reason.

---

### Requirement 12: Notification Permission UI Prompt

**User Story:** As a user, I want a clear, non-intrusive prompt asking for notification permission after I log in, so that I understand why the browser is requesting permission and can make an informed choice.

#### Acceptance Criteria

1. WHEN a Patient or Doctor logs in and Notification_Permission is `default` (not yet decided), THE Frontend SHALL display a permission request prompt within 3 seconds of successful authentication.
2. WHEN a user dismisses or denies the permission prompt, THE Frontend SHALL not show the prompt again in the same session.
3. WHEN Notification_Permission is already `granted` or `denied`, THE Frontend SHALL skip the permission prompt entirely.
4. THE permission prompt SHALL be non-blocking and SHALL NOT prevent the user from navigating to their dashboard.
