# Convex + React + Convex Auth

This is a template for using [Convex](https://docs.convex.dev/) with React and [Convex Auth](https://labs.convex.dev/auth).

## Setting up

```
npm create convex@latest -- -t react-vite-convexauth-shadcn
```

Navigate to the new directory and run:

```
npm run dev
```

It'll walk you through the auth environment variables setup.

## The app

The app is a basic multi-user chat. Walk through of the source code:

- [convex/auth.ts](./convex/auth.ts) configures the available authentication methods
- [convex/messages.ts](./convex/messages.ts) is the chat backend implementation
- [src/main.tsx](./src/main.tsx) is the frontend entry-point
- [src/App.tsx](./src/App.tsx) determines which UI to show based on the authentication state
- [src/SignInForm.tsx](./src/SignInForm.tsx) implements the sign-in UI
- [src/Chat/Chat.tsx](./src/Chat/Chat.tsx) is the chat frontend

## Configuring other authentication methods

To configure different authentication methods, see [Configuration](https://labs.convex.dev/auth/config) in the Convex Auth docs.
