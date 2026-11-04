import test from 'node:test';
import assert from 'node:assert/strict';
import {hoarderField,rankHoarders} from '../lib/hoarders.js';
test('reads alternate Pluto, Balls, Gold field names',()=>{const row={pluto:12,ball:3,goldCollected:100};assert.equal(hoarderField(row,'plut'),12);assert.equal(hoarderField(row,'balls'),3);assert.equal(hoarderField(row,'gold'),100)});
test('does not invent zeros for missing hoarder fields',()=>{assert.equal(hoarderField({score:500},'plut'),null);assert.equal(hoarderField({balls:0},'balls'),0)});

test('uses exact verified Hoarders keys',()=>{const row={plutoniumFound:196,footballGoals:3689,money:712100};assert.equal(hoarderField(row,'plut'),196);assert.equal(hoarderField(row,'balls'),3689);assert.equal(hoarderField(row,'gold'),712100)});

test('Hoarders ordered by coins (money), not plutonium',()=>{const input={rows:[{nickname:'A',plutoniumFound:196,footballGoals:3689,money:712100},{nickname:'B',plutoniumFound:500,footballGoals:100,money:100000},{nickname:'C',plutoniumFound:145,footballGoals:3150,money:640140}]};const out=rankHoarders(input);assert.deepEqual(out.rows.map(x=>x.nickname),['A','C','B']);assert.deepEqual(out.rows.map(x=>x.place),[1,2,3]);assert.equal(input.rows[0].place,undefined)});
