migstr - nostr relay migration
==============================

Simple tool to download events from nostr relays and either print them out or push them to a destination relay. Use this to easily migrate events from a number of relays to another or just to save your events to a file.

Run the following commands to print out events from a single relay:

```bash
$ author=61ba7de10f2617ddd1731af540b2d727285904419641b29dd0193b7121aa874d
$ npx migstr $author wss://relay.damus.io >/tmp/events.ndjson
```

If more than one relay is specified, the last relay is interpreted as the destination relay and events from the first relays will be sent to it.
