import { datadogRum } from '@datadog/browser-rum';

datadogRum.init({
    applicationId: 'cea3fe47-039f-47fb-91b3-57389419c2c9',
    clientToken: 'pub1ef411c82203fccee1b3d7b58d064f1d',
    // `site` refers to the Datadog site parameter of your organization
    // see https://docs.datadoghq.com/getting_started/site/
    site: 'datadoghq.com',
    service: 'ai-labs',
    env: 'production',
    // Specify a version number to identify the deployed version of your application in Datadog
    // version: '1.0.0',
    sessionSampleRate: 100,
    sessionReplaySampleRate: 100,
    defaultPrivacyLevel: 'mask-user-input',
});