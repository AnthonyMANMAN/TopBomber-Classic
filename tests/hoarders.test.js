import test from 'node:test';
import assert from 'node:assert/strict';
import {hoarderField} from '../lib/hoarders.js';
test('reads alternate Pluto, Balls, Gold field names',()=>{const row={pluto:12,ball:3,goldCollected:100};assert.equal(hoarderField(row,'plut'),12);assert.equal(hoarderField(row,'balls'),3);assert.equal(hoarderField(row,'gold'),100)});
test('does not invent zeros for missing hoarder fields',()=>{assert.equal(hoarderField({score:500},'plut'),null);assert.equal(hoarderField({balls:0},'balls'),0)});
