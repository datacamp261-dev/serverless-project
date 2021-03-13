import { CustomAuthorizerEvent, CustomAuthorizerResult } from 'aws-lambda'
import 'source-map-support/register'

import { verify, decode } from 'jsonwebtoken'
import { createLogger } from '../../utils/logger'
import Axios from 'axios'
import { Jwt } from '../../auth/Jwt'
import { JwtPayload } from '../../auth/JwtPayload'
const jwkToPem = require('jwk-to-pem')

const logger = createLogger('auth')

// A URL that can be used to download a certificate that can be used
// to verify JWT token signature.
const jwksUrl = 'https://dev-o5x2h8gz.eu.auth0.com/.well-known/jwks.json'
var cert

export const handler = async (event: CustomAuthorizerEvent): Promise<CustomAuthorizerResult> => {
  
  logger.info('Authorizing a user', event.authorizationToken)
  try {
    const jwtToken = await verifyToken(event.authorizationToken)
    logger.info('User was authorized', jwtToken)

    return {
      principalId: jwtToken.sub,
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Allow',
            Resource: '*'
          }
        ]
      }
    }
  } catch (e) {
    logger.error('User not authorized', { error: e.message })

    return {
      principalId: 'user',
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Deny',
            Resource: '*'
          }
        ]
      }
    }
  }
}

async function verifyToken(authHeader: string): Promise<JwtPayload> {
  
  if (!authHeader)
    throw new Error('No authentication header')

  if (!authHeader.toLowerCase().startsWith('bearer '))
    throw new Error('Invalid authentication header')
  
  const token = getToken(authHeader)
  const jwt: Jwt = decode(token, { complete: true }) as Jwt
  
  cert = await getCert(jwt)
  
  // You should implement it similarly to how it was implemented for the exercise for the lesson 5
  // You can read more about how to do this here: https://auth0.com/blog/navigating-rs256-and-jwks/
  logger.info('Verifying JWT with the Auth0 public cert')
  return verify(token, cert, { algorithms: ['RS256'] }) as JwtPayload
}

function getToken(authHeader: string): string {
  if (!authHeader) throw new Error('No authentication header')

  if (!authHeader.toLowerCase().startsWith('bearer '))
    throw new Error('Invalid authentication header')

  const split = authHeader.split(' ')
  const token = split[1]

  logger.info('Received Token: ', token)
  return token
}

async function getCert(jwt: Jwt): Promise<string> {
  if (!jwt) throw new Error('No JWT sent')
  
  if(cert){
    logger.info('Cert exists. Using the same one..')
    return cert
  }

  try{
    logger.info('Fetching signing cert from Auth0 jwks')
    
    const jwks = await Axios.get(jwksUrl)
    cert = extractCert(jwks.data.keys, jwt.header.kid)
    logger.info('Fetched certificate: ', cert)
    return cert
    
  }catch (e) {
    throw new Error('Could not retrieve signing certificate. ' + e)
  }
}

function extractCert(jwks, kid){
  try {
    return jwkToPem(jwks.filter(key => key.use === 'sig' // JWK property `use` determines the JWK is for signing
            && key.kty === 'RSA' // We are only supporting RSA (RS256)
            && key.kid           // The `kid` must be present to be useful for later
            && key.kid === kid
            && ((key.x5c && key.x5c.length) || (key.n && key.e)) // Has useful public keys
        )[0])
  } catch (e) {
    throw new Error('Could not extract certificate from received JWKS. ' + e)
  }
  
}

