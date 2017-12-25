import RJSON from 'relaxed-json';

import * as messages from 'messages';
import JSONParser from 'parsers/json';
import { MESSAGES_JSON, PREDEFINED_MESSAGES, MESSAGE_PLACEHOLDER_REGEXP } from 'const';
import { validateMessages } from 'schema/validator';
import log from 'logger';

export default class MessagesJSONParser extends JSONParser {
  constructor(jsonString, collector, {
    filename = MESSAGES_JSON, RelaxedJSON = RJSON,
  } = {}) {
    super(jsonString, collector, { filename });

    this.parse(RelaxedJSON);

    // Set up some defaults in case parsing fails.
    if (typeof this.parsedJSON === 'undefined' || this.isValid === false) {
      this.parsedJSON = {};
    } else {
      // We've parsed the JSON; now we can validate the manifest.
      this._validate();
    }
  }

  errorLookup(error) {
    // This is the default message.
    let baseObject = messages.JSON_INVALID;

    // This is the default from webextension-manifest-schema, but it's not a
    // super helpful error. We'll tidy it up a bit:
    if (error && error.message) {
      const lowerCaseMessage = error.message.toLowerCase();
      if (lowerCaseMessage === 'should not have additional properties') {
        // eslint-disable-next-line no-param-reassign
        error.message = 'is not a valid key or has invalid extra properties';
      }
    }

    const overrides = {
      message: `"${error.dataPath}" ${error.message}`,
      dataPath: error.dataPath,
    };

    // Missing the message property.
    if (error.keyword === 'required') {
      // TODO check that it's not a missing "content" property of a palceholder.
      baseObject = messages.MISSING_MESSAGE;
    }

    // TODO additional properties errors for INVALID_MESSAGE_NAME and INVALID_PLACEHOLDER_NAME

    return Object.assign({}, baseObject, overrides);
  }

  hasPlaceholder(message, placeholder) {
    const messageObj = this.prasedJSON[message];
    return 'placeholders' in messageObj &&
           placeholder in messageObj.placeholders;
  }

  _validate() {
    this.isValid = validateMessages(this.parsedJSON);
    if (!this.isValid) {
      log.debug('Schema Validation messages', validateMessages.errors);

      validateMessages.errors.forEach((error) => {
        const message = this.errorLookup(error);
        this.collector.addError(message);
      });
    }

    const regexp = new RegExp(MESSAGE_PLACEHOLDER_REGEXP, 'ig');
    Object.keys(this.parsedJSON).forEach((message) => {
      if (PREDEFINED_MESSAGES.includes(message)) {
        this.collector.addWarning(messages.PREDEFINED_MESSAGE_NAME);
      }

      let matches = regexp.exec(message);
      while (matches !== null) {
        if (!this.hasPlaceholder(message, matches[1])) {
          this.collector.addWarning(messages.MISSING_PLACEHOLDER);
        }
        matches = regexp.exec(message);
      }
      // Reset the regexp
      regexp.lastIndex = 0;
    });
  }
}
