import {getStore} from '@netlify/blobs';
export function store(){return getStore({name:'topbomber-classic',consistency:'strong'})}
export async function read(key){return await store().get(key,{type:'json'})}
export async function write(key,value){await store().setJSON(key,value)}
