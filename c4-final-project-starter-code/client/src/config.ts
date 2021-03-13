// TODO: Once your application is deployed, copy an API id here so that the frontend could interact with it
const apiId = '2ilq00nfl3'
export const apiEndpoint = `https://${apiId}.execute-api.eu-central-1.amazonaws.com/dev`

export const authConfig = {
  
  domain: 'dev-o5x2h8gz.eu.auth0.com',            // Auth0 domain
  clientId: '0GGMSjgS8MBEvLAEvVSgIpdyyydJ4my1',          // Auth0 client id
  callbackUrl: 'http://localhost:8080/callback'
}
