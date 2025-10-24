// tailwind css에서 layer를 제거한다
// 원래 tailwindcss로 컴파일하면 기본 레이어들은 자동으로 제거된다.
// 다만 daisyui에서 커스텀으로 만들어낸 레이어들이 문제인데
// daisyui v4.x를 이러한 커스텀 레이어를 사용하지 않아 문제가 발생하지 않는다.

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import postcss from 'postcss';

let postcssConfig = {
  plugins: [
    {
      // PostCSS 플러그인 이름
      postcssPlugin: 'remove-layer-at-rules',
      // CSS 처리가 끝난 후 실행되는 Once 훅
      Once(root, { result }) {
        // 각 레이어별로 규칙들을 수집할 배열
        const layers = {
        };

        // @layer가 아닌 일반 규칙들을 수집할 배열
        const nonLayerNodes = [];

        // 모든 노드를 순회하면서 @layer별로 분류
        root.each((node) => {
          if (node.type === 'atrule' && node.name === 'layer') {
            // @layer의 파라미터 (base, components, utilities 등)
            const layerName = node.params;

            if (!layers[layerName])
              layers[layerName] = []

            // @layer 안의 모든 자식 노드들을 복제하여 저장
            node.nodes.forEach((childNode) => {
              layers[layerName].push(childNode.clone());
            });

            // 원본 @layer 노드는 제거
            node.remove();
          } else {
            // @layer가 아닌 일반 노드는 별도로 보관
            // (이 노드는 나중에 다시 추가됩니다)
          }
        });

        // 올바른 순서로 레이어의 규칙들을 root에 추가
        // 순서: base → components → utilities
        //const orderedLayers = ['daisyui.component', 'daisyui.modifier'];
        const orderedLayers = ['daisyui.component'];

        orderedLayers.forEach((layerName) => {
          console.log(layerName)
          // 각 레이어의 규칙들을 순서대로 추가
          layers[layerName].forEach((node) => {
            root.append(node);
          });
        });
      },
    },
  ],
}

// 처리할 CSS 파일 경로
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const cssFile = path.resolve(__dirname, 'public/css/tailwind_output.css');

/**
 * PostCSS를 사용하여 CSS 파일을 처리하는 함수
 */
async function processCssFile() {
  try {
    console.log(`Reading CSS file: ${cssFile}`);
    const css = await fs.readFile(cssFile, 'utf8');

    console.log('Processing CSS with PostCSS...');
    // PostCSS 설정 파일을 사용하여 CSS를 처리합니다.
    const result = await postcss(postcssConfig.plugins).process(css, { from: cssFile, to: cssFile });

    console.log(`Writing processed CSS back to: ${cssFile}`);
    // 처리된 CSS를 원래 파일에 덮어씁니다.
    await fs.writeFile(path.resolve(__dirname, 'public/css/tailwind_output2.css'), result.css);

    // 결과에 경고가 있다면 출력합니다.
    if (result.warnings().length > 0) {
      console.log('PostCSS Warnings:');
      for (const warning of result.warnings()) {
        console.warn(warning.toString());
      }
    }

    console.log('Successfully processed CSS and removed @layer rules while preserving correct order.');

  } catch (error) {
    console.error('An error occurred during CSS processing:', error);
    if (error.name === 'CssSyntaxError') {
      console.error('CSS Syntax Error:', error.message, error.showSourceCode());
    }
  }
}

// 스크립트 실행
processCssFile();
