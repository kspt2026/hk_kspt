You are working on an Android emergency response system built with React Native + Kotlin native modules.

The React Native frontend already exists in the repository.
Do NOT rewrite the frontend architecture unless necessary.
Your task is to extend the existing app with Android-native emergency background functionality.

# High-level architecture

* React Native:

  * UI
  * maps
  * websocket/networking
  * auth
  * admin screens
  * buttons/dialogs rendering

* Kotlin native layer:

  * Android system integration
  * GPS access
  * emergency background logic
  * notifications
  * foreground service during SOS mode
  * periodic location uploads

# IMPORTANT PRIVACY REQUIREMENT

The app MUST NOT continuously track or upload GPS.

Before a disaster is announced:

* the app does NOT access GPS
* the app only waits for a disaster event from the server

After a disaster is announced:

* the app locally checks whether the user is inside the dangerous polygon
* GPS remains LOCAL ONLY
* GPS is NOT uploaded to the server unless SOS mode becomes active

GPS upload to the server happens ONLY when:

* user explicitly requests help
  OR
* user does not answer within 60 seconds

If user initially declines help:

* no GPS is uploaded
* however the user can later manually activate SOS mode using a button

# Core flow

1. App waits for disaster event from server

Server sends:
{
type: "DISASTER_STARTED",
polygon: [[x1,y1],[x2,y2],[x3,y3],[x4,y4]]
} or sth like that You will get scan from backend later

2. React Native passes polygon to Kotlin native module

3. Kotlin starts periodic local GPS checks

4. If user enters polygon:

* show emergency confirmation popup:
  "Do you need help?"

5. Outcomes:

YES:

* activate SOS mode

NO:

* enter HELP_DECLINED state
* do NOT upload GPS

TIMEOUT (60 sec):

* activate SOS mode automatically

6. During SOS_ACTIVE:

* start Android Foreground Service
* upload GPS to server every 5 minutes

7. User can manually:

* activate SOS from HELP_DECLINED state
* cancel SOS later

# Required states

Implement a persistent state machine with states similar to:

IDLE
DISASTER_ACTIVE
WAITING_CONFIRMATION
HELP_DECLINED
SOS_ACTIVE
SOS_CANCELLED

State must survive:

* app restart
* process death

# Android-specific requirements

Use:

* Kotlin
* React Native Native Modules / Bridge
* FusedLocationProviderClient
* Foreground Service ONLY during SOS_ACTIVE
* WorkManager if needed for periodic checks
* Notifications with action buttons
* Persistent local storage (DataStore or SharedPreferences)

Avoid:

* permanent foreground service
* always-on tracking
* unnecessary battery usage

# Current task

Analyze the existing repository structure first.

Then:

1. Propose Android-native architecture
2. Identify where Kotlin native modules should live
3. Create a minimal implementation plan
4. List required Android permissions
5. Explain how RN and Kotlin should communicate
6. DO NOT generate huge amounts of code immediately
7. Start incrementally and production-oriented
8. Wait for scan from branch with backend to start work on kotlin

Focus on maintainability and Android reliability.