"use strict";

const HONEY_BOT_MANUAL_LOCK = 42;
const INTERCOM_LOCK = 411;

const initialGameState = {
  introMessagePlayed: false,
  accessLevel: "guest",
  intercomActive: false,
  bigMamaCode: false,
  bigPapaCode: false,
  holdingCellUnlocked: false,
  disengagedLocks: []
};

// Hacky global data state variable
var dataStore;

if (!dataStore) {
  dataStore = initialGameState;
}

// --------------- Helpers that build all of the responses -----------------------

function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
  return {
    outputSpeech: {
      type: "PlainText",
      text: output
    },
    card: {
      type: "Simple",
      title: `SessionSpeechlet - ${title}`,
      content: `SessionSpeechlet - ${output}`
    },
    reprompt: {
      outputSpeech: {
        type: "PlainText",
        text: repromptText
      }
    },
    shouldEndSession
  };
}

function buildResponse(sessionAttributes, speechletResponse) {
  return {
    version: "1.0",
    sessionAttributes,
    response: speechletResponse
  };
}

// --------------- Functions that control the skill's behavior -----------------------

function getWelcomeResponse(callback) {
  if (!dataStore.introMessagePlayed) {
    playIntroMessage(callback);
    return;
  }

  const sessionAttributes = {};
  const cardTitle = "Welcome";
  const speechOutput = "Honey bot online.";

  const repromptText = null;
  const shouldEndSession = false;

  callback(
    sessionAttributes,
    buildSpeechletResponse(
      cardTitle,
      speechOutput,
      repromptText,
      shouldEndSession
    )
  );
}

function handleSessionEndRequest(callback) {
  const cardTitle = "Session Ended";
  const speechOutput = "Honey bot signing off.";
  // Setting this to true ends the session and exits the skill.
  const shouldEndSession = true;

  callback(
    {},
    buildSpeechletResponse(cardTitle, speechOutput, null, shouldEndSession)
  );
}

function handleUnknownRequest(callback) {
  const cardTitle = "Session Ended";
  const speechOutput = "Honey bot doesn't understand what you want.";
  const shouldEndSession = true;

  callback(
    {},
    buildSpeechletResponse(cardTitle, speechOutput, null, shouldEndSession)
  );
}

// --------------- Hidden debug functions -----------------------

function resetGlobalState(intent, session, callback) {
  const repromptText = null;
  const shouldEndSession = true;

  dataStore = initialGameState;

  return `Game state has been reset.`;
}

function dumpGlobalState(intent, session, callback) {
  const keys = Object.keys(dataStore);
  let response = "Game state: ";
  for (var i = 0, len = keys.length; i < len; i++) {
    const key = keys[i];
    response += `${key} = ${dataStore[key]}`;
  }

  return response;
}

// --------------- Gameplay -----------------------

function buildSystemStatus() {
  let status =
    `Your access level is ${dataStore.accessLevel}.  ` +
    `Intercom, ${dataStore.intercomActive ? "online" : "offline"}.  ` +
    "Holding cell lock, engaged.  Break room access, denied.  Vault lock, secure.  Intruder mitigation, standby mode.  ";
  if (dataStore.disengagedLocks.length > 0) {
    status =
      status +
      `You have disengaged the following locks: #${dataStore.disengagedLocks.join(
        ", #"
      )}.`;
  }
  return status;
}

function playIntroMessage(callback) {
  const cardTitle = "Intro";
  const speechOutput =
    "Doot.  Doot.  Doot.  Honey bot now online.  Performing system check.  Please bear with me...  Doot.  Doot.  Doot.  " +
    `System check complete.  System status: ${buildSystemStatus()}.` +
    `The following is a system message:  Lock #${HONEY_BOT_MANUAL_LOCK} is now disengaged.  I repeat.  ` +
    `Lock #${HONEY_BOT_MANUAL_LOCK} is now disengaged.  Thank you for using Honey Bot.`;
  const shouldEndSession = true;

  dataStore.introMessagePlayed = true;
  dataStore.disengagedLocks.push(HONEY_BOT_MANUAL_LOCK);

  callback(
    {},
    buildSpeechletResponse(cardTitle, speechOutput, null, shouldEndSession)
  );
}

function playSystemStatus(intent, session, callback) {
  const speechOutput = `System status: ${buildSystemStatus()}.`;
  return speechOutput;
}

function loginAsUser(intent, session, callback) {
  const user = intent.slots.userName.value.toLowerCase();

  let speechOutput;
  if (user.includes("sampson") || user.includes("samson")) {
    speechOutput =
      "Authorization successful.  Access to intercom subsystem granted.  Your access level is: employee.";
    dataStore.accessLevel = "employee";
  } else {
    return `Error.  Unrecognized user ${user}.`;
  }

  return speechOutput;
}

function activateSubsystem(intent, session, callback) {
  const subsystem = intent.slots.subsystem.value.toLowerCase();

  let speechOutput;
  if (subsystem === "intercom") {
    if (dataStore.accessLevel === "guest") {
      speechOutput = `Insufficient access to perform this operation.  Your access level is ${
        dataStore.accessLevel
      }.`;
    } else {
      speechOutput =
        `Intercom is now active.  The following is a system message:  Locks #${INTERCOM_LOCK} and #${INTERCOM_LOCK}B are now disengaged.  ` +
        `I repeat: Locks #${INTERCOM_LOCK} and #${INTERCOM_LOCK}B are now disengaged.`;
      dataStore.intercomActive = true;
      dataStore.disengagedLocks.push(INTERCOM_LOCK);
    }
  } else {
    speechOutput = `Unknown subsystem ${subsystem} .`;
  }

  return speechOutput;
}

function authorizeAccessCode(intent, session, callback) {
  const codeType = intent.slots.type.value.toLowerCase();
  const code = intent.slots.code.value.toLowerCase();

  switch (codeType) {
    case "big papa": {
      if (!code.includes("between brazil animal women")) {
        return `Invalid big papa access code ${code}`;
      }
      dataStore.bigPapaCode = true;
      return "Big papa access code validated.";
    }
    case "big mama": {
      if (!code.includes("you are ready like sure you are")) {
        return `Invalid big mama access code ${code}`;
      }
      dataStore.bigMamaCode = true;
      return "Big mama access code validated.";
    }
    default: {
      return `Unknown code name ${codeType}`;
    }
  }
}

function disengageLock(intent, session, callback) {
  const lockName = intent.slots.lockName.value.toLowerCase();

  switch (lockName) {
    case "holding cell": {
      if (!dataStore.bigMamaCode) {
        return "Unauthorized.  This operation requires the big mama access code.";
      }
      if (!dataStore.bigPapaCode) {
        return "Unauthorized.  This operation requires the big papa access code.";
      }
      dataStore.holdingCellUnlocked = true;
      return (
        "Holding cell lock has been released.  System message.  Please fetch the game master for a status update.  " +
        "I repeat.  Please fetch the game master for a status update."
      );
    }
    default: {
      return `Unknown lock name ${lockName}`;
    }
  }
}

// --------------- Events -----------------------

/**
 * Called when the session starts.
 */
function onSessionStarted(sessionStartedRequest, session) {
  console.log(
    `onSessionStarted requestId=${sessionStartedRequest.requestId}, sessionId=${
      session.sessionId
    }`
  );
}

/**
 * Called when the user launches the skill without specifying what they want.
 */
function onLaunch(launchRequest, session, callback) {
  console.log(
    `onLaunch requestId=${launchRequest.requestId}, sessionId=${
      session.sessionId
    }`
  );

  // Dispatch to your skill's launch.
  getWelcomeResponse(callback);
}

/**
 * Called when the user specifies an intent for this skill.
 */
function onIntent(intentRequest, session, callback) {
  console.log(
    `onIntent requestId=${intentRequest.requestId}, sessionId=${
      session.sessionId
    }`
  );

  const intent = intentRequest.intent;
  const intentName = intentRequest.intent.name;

  const handlers = {
    ResetGlobalState: resetGlobalState,
    DumpGlobalState: dumpGlobalState,
    SystemStatus: playSystemStatus,
    LoginAsUser: loginAsUser,
    ActivateSubsystem: activateSubsystem,
    AuthorizeAccess: authorizeAccessCode,
    DisengageLock: disengageLock
  };
  const handler = handlers[intentName];
  if (handler) {
    const output = handler(intent, session, callback);
    callback({}, buildSpeechletResponse("", output, null, true));
  } else if (intentName === "AMAZON.HelpIntent") {
    getWelcomeResponse(callback);
  } else if (
    intentName === "AMAZON.StopIntent" ||
    intentName === "AMAZON.CancelIntent"
  ) {
    handleSessionEndRequest(callback);
  } else {
    handleUnknownRequest(callback);
  }
}

/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {
  console.log(
    `onSessionEnded requestId=${sessionEndedRequest.requestId}, sessionId=${
      session.sessionId
    }`
  );
  // Add cleanup logic here
}

// --------------- Main handler -----------------------

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = (event, context, callback) => {
  try {
    console.log(
      `event.session.application.applicationId=${
        event.session.application.applicationId
      }`
    );

    /**
     * Uncomment this if statement and populate with your skill's application ID to
     * prevent someone else from configuring a skill that sends requests to this function.
     */
    /*
        if (event.session.application.applicationId !== 'amzn1.echo-sdk-ams.app.[unique-value-here]') {
             callback('Invalid Application ID');
        }
        */

    if (event.session.new) {
      onSessionStarted({ requestId: event.request.requestId }, event.session);
    }

    if (event.request.type === "LaunchRequest") {
      onLaunch(
        event.request,
        event.session,
        (sessionAttributes, speechletResponse) => {
          callback(null, buildResponse(sessionAttributes, speechletResponse));
        }
      );
    } else if (event.request.type === "IntentRequest") {
      onIntent(
        event.request,
        event.session,
        (sessionAttributes, speechletResponse) => {
          callback(null, buildResponse(sessionAttributes, speechletResponse));
        }
      );
    } else if (event.request.type === "SessionEndedRequest") {
      onSessionEnded(event.request, event.session);
      callback();
    }
  } catch (err) {
    callback(err);
  }
};
