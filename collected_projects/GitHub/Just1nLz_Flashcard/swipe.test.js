import test from 'node:test';import assert from 'node:assert/strict';import {isNextCardSwipe} from './swipe.js';
test('a deliberate left swipe advances',()=>{assert(isNextCardSwipe(-100,5,300));assert(isNextCardSwipe(-72,0,900));});
test('right swipes, taps, short drags, and vertical scrolling do not advance',()=>{for(const args of [[100,0,300],[0,0,100],[-45,3,300],[-80,130,400],[-100,80,400]])assert(!isNextCardSwipe(...args));});
test('long press gestures and invalid coordinates do not advance',()=>{for(const args of [[-100,0,2000],[-100,0,-1],[NaN,0,300],[-100,Infinity,300]])assert(!isNextCardSwipe(...args));});
