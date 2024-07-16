"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMutation, useQuery } from "convex/react";
import { FormEvent, useEffect, useState } from "react";
import { api } from "../../convex/_generated/api";
import { MessageList } from "@/Chat/MessageList";
import { Message } from "@/Chat/Message";
import { Id } from "../../convex/_generated/dataModel";
import { useKeyPair } from "./keyExchange";


export function MultiChat({ viewer }: { viewer: Id<"users"> }) {
  const [recipient, setRecipient] = useState<Id<"users">>(viewer);
  const users = useQuery(api.users.list);

  return <div className="flex flex-grow">
    <div className="flex flex-col gap-2">
      {users?.map((user) => (
        <Button
          key={user._id}
          onClick={() => setRecipient(user._id)}
          className={recipient === user._id ? "bg-primary" : ""}
          disabled={recipient === user._id}
        >
          {user.name ?? user.email}
        </Button>
      ))}
    </div>
    <div className="flex flex-col flex-grow">
      <Chat viewer={viewer} recipient={recipient} />
    </div>
  </div>
}

export function Chat(
{
  viewer,
  recipient,
}: {
  viewer: Id<"users">,
  recipient: Id<"users">,
}) {
  const recipientKey = useQuery(api.users.getPublicKey, { userId: recipient });
  const { deriveSharedSecret } = useKeyPair();
  const [ aesKey, setAesKey ] = useState<CryptoKey | null>(null);
  useEffect(() => {
    void (async () => {
      if (deriveSharedSecret && recipientKey) {
        const key = await deriveSharedSecret(recipientKey);
        if (key) {
          setAesKey(key);
        }
      }
    })();
  }, [deriveSharedSecret, recipientKey]);

  if (!aesKey) {
    return <div>Generating key…</div>;
  }
  return <EncryptedChat
    viewer={viewer}
    recipient={recipient}
    aesKey={aesKey}
  />;
}

export function EncryptedChat(
  {
    viewer,
    recipient,
    aesKey,
  }: {
    viewer: Id<"users">,
    recipient: Id<"users">,
    aesKey: CryptoKey,
  }) {
  const [newMessageText, setNewMessageText] = useState("");
  const messages = useQuery(api.messages.list, { recipient });
  const sendMessage = useMutation(api.messages.send);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void (async () => {
      const encryptedBody = await encryptString(newMessageText, aesKey);
      await sendMessage({ body: encryptedBody, recipient })
      setNewMessageText("");
    })();
  };

  return (
    <>
      <MessageList>
        {messages?.map((message) => (
          <Message
            key={message._id}
            author={message.userId}
            authorName={message.author}
            viewer={viewer}
          >
            <DecryptedMessage encryptedBody={message.body} aesKey={aesKey} />
          </Message>
        ))}
      </MessageList>
      <div className="border-t">
        <form onSubmit={handleSubmit} className="container flex gap-2 py-4">
          <Input
            value={newMessageText}
            onChange={(event) => setNewMessageText(event.target.value)}
            placeholder="Write a message…"
          />
          <Button type="submit" disabled={newMessageText === ""}>
            Send
          </Button>
        </form>
      </div>
    </>
  );
}

export function DecryptedMessage({ encryptedBody, aesKey }: { encryptedBody: string, aesKey: CryptoKey }) {
  const [decryptedBody, setDecryptedBody] = useState<string | null>(null);
  const [decryptionError, setDecryptionError] = useState<string | null>(null);
  useEffect(() => {
    void (async () => {
      try {
        console.log("decrypting", encryptedBody);
        const decryptedBody = await decryptString(encryptedBody, aesKey);
        console.log("decrypted", decryptedBody);
        setDecryptedBody(decryptedBody);
      } catch (error: any) {
        if (error.message) {
          console.error(error);
          setDecryptionError(error.message);
        }
      }
    })();
  }, [encryptedBody, aesKey]);
  if (decryptionError !== null) {
    return <span className="text-error">{decryptionError}</span>;
  }
  return <>{decryptedBody ?? "Decrypting…"}</>;
}

async function encryptString(plaintext: string, aesKey: CryptoKey): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encryptedData = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    data
  );

  const encryptedArray = new Uint8Array(iv.length + encryptedData.byteLength);
  encryptedArray.set(iv);
  encryptedArray.set(new Uint8Array(encryptedData), iv.length);

  return btoa(String.fromCharCode(...encryptedArray));
}

async function decryptString(ciphertext: string, aesKey: CryptoKey): Promise<string> {
  const encryptedArray = new Uint8Array(atob(ciphertext).split('').map(char => char.charCodeAt(0)));
  const iv = encryptedArray.slice(0, 12);
  const encryptedData = encryptedArray.slice(12);

  const decryptedData = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    encryptedData
  );

  const decoder = new TextDecoder();
  return decoder.decode(decryptedData);
}
