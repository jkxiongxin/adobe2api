# Adobe AT Refresh Capture

Standalone Chrome extension for exporting the minimal Adobe refresh bundle used by:

- `https://adobeid-na1.services.adobe.com/ims/check/v6/token`

## Load extension

1. Open `chrome://extensions`
2. Enable developer mode
3. Click `Load unpacked`
4. Select folder `at-refresh-capture-extension`

## Usage

1. Open Firefly and click extension popup
2. Keep capture enabled
3. Perform sign-in flow on `https://firefly.adobe.com`
4. Return to popup and click `Export Refresh Bundle`
5. Import exported JSON in `adobe2api` admin page

## Security

- Export contains sensitive cookie and auth headers.
- Keep the file private and rotate session after sharing.
