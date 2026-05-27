import { Injectable } from '@nestjs/common';
import * as bwipjs from 'bwip-js';

export type BarcodeBar = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type BarcodeVector = {
  width: number;
  height: number;
  bars: BarcodeBar[];
};

@Injectable()
export class Code128BarcodeService {
  toSvg(text: string) {
    return bwipjs.toSVG({
      bcid: 'code128',
      text,
      scale: 2,
      height: 8,
      includetext: false,
      paddingwidth: 0,
      paddingheight: 0,
      monochrome: true,
    });
  }

  toVector(text: string): BarcodeVector {
    const bars: BarcodeBar[] = [];
    let width = 0;
    let height = 0;

    bwipjs.render(
      {
        bcid: 'code128',
        text,
        scale: 2,
        height: 8,
        includetext: false,
      },
      {
        scale: () => null,
        measure: (value, _font, fontWidth, fontHeight) => ({
          width: value.length * fontWidth * 0.6,
          ascent: fontHeight * 0.7,
          descent: fontHeight * 0.2,
        }),
        init: (nextWidth, nextHeight) => {
          width = nextWidth;
          height = nextHeight;
        },
        line: (x0, y0, x1, y1, lineWidth, rgb) => {
          if (rgb !== '000000') return;
          const x = Math.min(x0, x1) - lineWidth / 2;
          const y = Math.min(y0, y1);
          bars.push({
            x,
            y,
            width: lineWidth,
            height: Math.abs(y1 - y0) || height,
          });
        },
        polygon: () => undefined,
        hexagon: () => undefined,
        ellipse: () => undefined,
        fill: () => undefined,
        text: () => undefined,
        end: () => ({ width, height, bars }),
      },
    );

    return { width, height, bars };
  }
}
