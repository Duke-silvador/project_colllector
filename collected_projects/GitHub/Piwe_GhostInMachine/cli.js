#!/usr/bin/env node
// ghostlog: tell me what my house saw last night.

import { parseArgs } from 'node:util';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { generateNight } from './src/night.js';
import { activities } from './src/activities.js';
import { formatLog, toJsonl, parseImportedLog } from './src/logs.js';
import { narrate, buildMessages } from './src/narrator/index.js';
import { tones } from './src/narrator/prompt.js';
import { scoreNight, summarise } from './src/anomaly/index.js';
import { speak } from './src/voice.js';

const { values: o } = parseArgs({
  options: {
    seed: { type: 'string' },
    date: { type: 'string' },
    extras: { type: 'string', default: '7' },
    setting: { type: 'string' },
    include: { type: 'string' },
    log: { type: 'string' },
    tone: { type: 'string', default: 'literary' },
    model: { type: 'string' },
    provider: { type: 'string' },
    'base-url': { type: 'string' },
    offline: { type: 'boolean' },
    strict: { type: 'boolean' },
    scorer: { type: 'string', default: 'auto' },
    voice: { type: 'string' },
    'show-log': { type: 'boolean' },
    prompt: { type: 'boolean' },
    save: { type: 'string' },
    list: { type: 'boolean' },
    help: { type: 'boolean', short: 'h' },
  },
});

process.stdout.on('error', (err) => process.exit(err.code === 'EPIPE' ? 0 : 1));

const dim = (s) => (process.stdout.isTTY ? `\x1b[2m${s}\x1b[0m` : s);
const red = (s) => (process.stderr.isTTY ? `\x1b[31m${s}\x1b[0m` : s);

if (o.help) {
  console.log(`ghostlog: a ghost story generator for your smart home's sensor logs

Usage: node cli.js [options]

Night
  --seed <s>          replay a specific night (same seed, same haunting)
  --date <YYYY-MM-DD> the evening the night starts on (default: today)
  --extras <n>        how many random hauntings to add (default 7)
  --setting <n>       how many of the 5 setting activities to use (default all)
  --include <a,b>     force specific activities (see --list)
  --log <file>        narrate a real log instead (Home Assistant history JSON, JSON/JSONL, CSV)

Narrator
  --tone <t>          ${Object.keys(tones).join(' | ')} (default literary)
  --model <m>         local model (default $GHOST_MODEL or gemma4:e4b)
  --provider <p>      ollama | openai  (OpenAI-compatible: llama.cpp, vLLM, LM Studio)
  --base-url <url>    model server URL
  --offline           skip the model and use the template narrator
  --strict            fail instead of falling back to the template narrator

Anomaly detection
  --scorer <s>        auto | tabpfn | logistic | none (default auto: TabPFN, else logistic)

Voice
  --voice <v>         piper | elevenlabs: also read the story aloud to an audio file

Output
  --show-log          print the sensor log before the story
  --prompt            print the prompt that would be sent to the model, and exit
  --save <dir>        write the log (.jsonl, .log) and story (.md) to a folder
  --list              list every activity in the catalog`);
  process.exit(0);
}

if (o.list) {
  for (const a of activities) console.log(`${a.kind.padEnd(8)} ${a.id.padEnd(24)} ${a.title}`);
  process.exit(0);
}

try {
  const night = o.log
    ? parseImportedLog(readFileSync(o.log, 'utf8'))
    : generateNight({
        seed: o.seed,
        date: o.date,
        extras: Number(o.extras),
        settingCount: o.setting != null ? Number(o.setting) : Infinity,
        include: o.include ? o.include.split(',').map((s) => s.trim()) : [],
      });

  if (o.scorer !== 'none') {
    const result = await scoreNight(night, { scorer: o.scorer });
    night.scores = result.scores;
    let line = `anomaly detector: ${result.scorer === 'tabpfn' ? 'TabPFN' : 'logistic baseline'}`;
    if (night.source === 'simulated') {
      const s = summarise(night, result.scores);
      line += ` · caught ${s.caught} of ${s.haunted} haunted readings, ${s.falseAlarms} false alarm${s.falseAlarms === 1 ? '' : 's'}`;
    } else {
      line += ` · flagged ${result.scores.filter((x) => x >= 0.5).length} of ${night.events.length} readings`;
    }
    if (!o.prompt) console.error(dim(line));
    if (result.note && !o.prompt) console.error(red(`⚠ ${result.note}`));
  }

  if (o.prompt) {
    for (const m of buildMessages(night, { tone: o.tone })) console.log(`=== ${m.role} ===\n${m.content}\n`);
    process.exit(0);
  }

  const header = night.seed ? `night of ${night.date} · seed ${night.seed}` : `imported log · ${night.events.length} events`;
  console.log(dim(`👻 ${header}`));
  if (o['show-log']) console.log(dim(`\n${formatLog(night)}\n`));

  let story = '';
  const opts = {
    tone: o.tone, model: o.model, provider: o.provider, baseUrl: o['base-url'],
    offline: o.offline, strict: o.strict, delayMs: process.stdout.isTTY ? 8 : 0,
  };
  for await (const chunk of narrate(night, opts)) {
    if (typeof chunk === 'string') {
      story += chunk;
      process.stdout.write(chunk);
    } else {
      if (chunk.warning) console.error(red(`⚠ ${chunk.warning}`));
      console.log(dim(`narrator: ${chunk.narrator}\n`));
    }
  }
  process.stdout.write('\n');

  const name = night.seed ? `${night.date}-${night.seed}` : `${night.date}-imported`;
  if (o.voice) {
    console.error(dim(`reading it aloud with ${o.voice}…`));
    const { audio, extension } = await speak(story, { provider: o.voice });
    const dir = o.save || '.';
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `${name}.${extension}`), audio);
    console.log(dim(`voice saved to ${join(dir, `${name}.${extension}`)}`));
  }

  if (o.save) {
    mkdirSync(o.save, { recursive: true });
    writeFileSync(join(o.save, `${name}.jsonl`), toJsonl(night) + '\n');
    writeFileSync(join(o.save, `${name}.log`), formatLog(night) + '\n');
    writeFileSync(join(o.save, `${name}.md`), story.trim() + '\n');
    console.log(dim(`saved to ${join(o.save, name)}.{jsonl,log,md}`));
  }
} catch (err) {
  console.error(red(`👻 ${err.message}`));
  process.exit(1);
}
