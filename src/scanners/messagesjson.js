import MessagesJSONParser from 'parsers/fluent';
import JSONScanner from 'scanners/json';

export default class MessagesJSONScanner extends JSONScanner {
  static get scannerName() {
    return 'messages';
  }

  scan() {
    return this.getContents()
      .then((json) => {
        const jsonParser = new MessagesJSONParser(
          json,
          this.options.collector,
          { filename: this.filename }
        );
        jsonParser.parse();
        return Promise.resolve({
          linterMessages: [],
          scannedFiles: [this.filename],
        });
      })
      .catch((err) => {
        return Promise.reject(err);
      });
  }
}
