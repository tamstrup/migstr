#!/usr/bin/env node

import WebSocket from 'ws'
import crypto from 'crypto';

const uuid = () => {
  const buf = crypto.randomBytes(16);
  buf[6] = (buf[6] & 0x0f) | 0x40;
  buf[8] = (buf[8] & 0x3f) | 0x80;
  return buf.toString('hex').match(/.{1,8}/g).join('-');
};

const pubid = process.argv[2]
    , srcs = process.argv.slice(3)

if (process.argv.includes('--help') || !pubid || !srcs.length) {
  usage()
  process.exit(1)
}

const send = async (ws, data) => {
  return new Promise((resolve, reject) => {
    ws.send(JSON.stringify(data), err => {
      if (err) reject(err)
      else resolve()
    })
  })
}

const pull = (relay) => {
  const events = []
  let subid, ws, unresolved = true
  return new Promise((resolve, reject) => {
    try {
      ws = new WebSocket(relay)
      ws.on('error', reject)
      ws.on('message', async (data) => {
        const [type, _subid, event] = JSON.parse(data)
        if (type === 'EOSE') {
          await send(ws, ["CLOSE", subid])
          ws.close()
          resolve(events)
        } else {
          events.push(event)
        }
      })
      ws.on('open', async () => {
        subid = uuid()
        await send(ws, ['REQ', subid, { authors: [pubid] }])
      })
      ws.on('close', () => unresolved && resolve(events))
    } catch (err) {
      reject(err)
    }
  })
}

const seen = new Set()
    , events = []
for (const src of srcs) {
  const relayEvents = await pull(src)
  for (const event of relayEvents) {
    if (!seen.has(event.id)) {
      events.push(event)
      seen.add(event.id)
    }
  }
}

const dest = 1 < srcs.length && srcs.at(-1)
if (!dest) {
  for (const event of events) console.log(JSON.stringify(event))
}
else {
  await migrate(events)
}

function usage() {
console.log(
`usage: migstr PUBID SRC... DEST
       migstr PUBID SRC

Import nostr events from relays specified by SRCs to DEST. If only one
SRC is specified, print out all events from SRC to stdout. PUBID is the
public ID of the author of the events in hex format.
`
)
}

function migrate(events) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(dest)
    ws.on('error', reject)
    ws.on('open', async () => {
      try {
        await Promise.all(events.map(x => send(ws, ['EVENT', x])))
        resolve()
      } catch (err) {
        reject(err)
      }
      finally {
        ws.close()
      }
    })
  })
}

// vim: set sts=2 sw=2 et ai:
