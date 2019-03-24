/* @flow */
'use strict';

import type NodeContainer from './NodeContainer';
import {Bounds, parseBounds} from './Bounds';
import {TEXT_DECORATION} from './parsing/textDecoration';

import FEATURES from './Feature';
import {breakWords, toCodePoints, fromCodePoint} from './Unicode';

export class TextBounds {
    text: string;
    bounds: Bounds;

    constructor(text: string, bounds: Bounds) {
        this.text = text;
        this.bounds = bounds;
    }
}

export const parseTextBounds = (
    value: string,
    parent: NodeContainer,
    node: Text
): Array<TextBounds> => {
    const letterRendering = parent.style.letterSpacing !== 0;
    let  textList = letterRendering
        ? toCodePoints(value).map(i => fromCodePoint(i))
        : breakWords(value, parent);

        textList.forEach(function(word, index) {
            console.log(word+'::', index)
            if (/.*[\u0E30-\u0E3A\u0E47-\u0E4E].*/.test(word)) {
                console.log('match', word)
                if(textList[index-1] !== ''){
                    //for vowel only 
                    textList[index-1] += word;
                    console.log('textList[index-1] !== ', textList[index-1])
                }else{
                    //for vowel and tone marks
                    textList[index-2] += word;
                    console.log('else', textList[index-2])
                }
                textList[index] = '';
                console.log('final', textList[index])
            }
        });

        console.log('textList', textList)
    
    const length = textList.length;
    const defaultView = node.parentNode ? node.parentNode.ownerDocument.defaultView : null;
    const scrollX = defaultView ? defaultView.pageXOffset : 0;
    const scrollY = defaultView ? defaultView.pageYOffset : 0;
    const textBounds = [];
    let offset = 0;
    for (let i = 0; i < length; i++) {
        let text = textList[i];
        if (parent.style.textDecoration !== TEXT_DECORATION.NONE || text.trim().length > 0) {
            if (FEATURES.SUPPORT_RANGE_BOUNDS) {
                textBounds.push(
                    new TextBounds(
                        text,
                        getRangeBounds(node, offset, text.length, scrollX, scrollY)
                    )
                );
            } else {
                const replacementNode = node.splitText(text.length);
                textBounds.push(new TextBounds(text, getWrapperBounds(node, scrollX, scrollY)));
                node = replacementNode;
            }
        } else if (!FEATURES.SUPPORT_RANGE_BOUNDS) {
            node = node.splitText(text.length);
        }
        offset += text.length;
    }
    return textBounds;
};

const getWrapperBounds = (node: Text, scrollX: number, scrollY: number): Bounds => {
    const wrapper = node.ownerDocument.createElement('html2canvaswrapper');
    wrapper.appendChild(node.cloneNode(true));
    const parentNode = node.parentNode;
    if (parentNode) {
        parentNode.replaceChild(wrapper, node);
        const bounds = parseBounds(wrapper, scrollX, scrollY);
        if (wrapper.firstChild) {
            parentNode.replaceChild(wrapper.firstChild, wrapper);
        }
        return bounds;
    }
    return new Bounds(0, 0, 0, 0);
};

const getRangeBounds = (
    node: Text,
    offset: number,
    length: number,
    scrollX: number,
    scrollY: number
): Bounds => {
    const range = node.ownerDocument.createRange();
    range.setStart(node, offset);
    range.setEnd(node, offset + length);
    return Bounds.fromClientRect(range.getBoundingClientRect(), scrollX, scrollY);
};
