# End-to-End Encrypted Chat with Convex

## [https://endtoendconvex.vercel.app](https://endtoendconvex.vercel.app)

This app showcases secure messaging between pairs of users.
Each message is encrypted end-to-end, so the only place the message exists
unencrypted is in the sender and receiver's browser.

## How to use it

Go to [https://endtoendconvex.vercel.app](https://endtoendconvex.vercel.app)
and log in with Github. Then you can select a recipient on the left side of the
page, and start messaging them. If you message yourself, you can use the space
for writing private notes.

## How it works

Both clients create a public/private key pair. The public and private key are
stored in the browser's secure storage, and the public key is published to
the "keys" table in Convex.

To send a message, a client uses an
[Elliptic Curve Diffie-Hellman](https://en.wikipedia.org/wiki/Elliptic-curve_Diffie%E2%80%93Hellman)
key exchange
to generate an AES key, using the client's private key and the recipient's
public key. Both the sender and receiver can generate the *same* AES key in this
way, and with this shared key they can use
[symmetric AES encyption](https://en.wikipedia.org/wiki/Advanced_Encryption_Standard)
to encrypt and decrypt messages.

## When does it not work?

The encryption keys for an account are stored in the browser's storage,
so logging in to the same account from a different browser will create new
keys, causing the user to lose access to all of their previous messages.

## What about Whisper?

Contrast with
[Whisper](https://stack.convex.dev/end-to-end-encryption-with-convex):

- End-to-End Chat requires login, while Whisper does not.
- Whisper requires sending the password through a secure channel, while End-to-End Chat uses key exchanges to send passwords securely through insecure channels.
- Whisper allows secrets to expire, while End-to-End Chat keeps secrets available as long as the client keeps their keys.

## Run it yourself

Set environment variables `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`, `JWKS`,
`JWT_PRIVATE_KEY`, and `SITE_URL` to configure
[Convex Auth](https://docs.convex.dev/auth/convex-auth).

```
npm run dev
```
