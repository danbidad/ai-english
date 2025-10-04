let sentenceAnalysisComponent = {
  bindings: {
    parsedBlocks: '<'
  },
  template: `
<div ng-if="$ctrl.parsedBlocks && $ctrl.parsedBlocks.length">
  <h3>문장 학습</h3>

  {{ $ctrl.parsedBlocks[$ctrl.currentIndex - 1].blocks_translation }}

  <!-- 문장 표시 영역 -->
  <div class="sentence-display">
    <div class="sentence-text">
      <span class="block-wrapper" ng-repeat="b in $ctrl.parsedBlocks track by $index">
        <span ng-class="{
          'revealed': $index < $ctrl.currentIndex,
          'hidden': $index >= $ctrl.currentIndex,
          'current-text-block': $index === $ctrl.currentIndex - 1 && $ctrl.currentIndex > 0
        }">{{ b.text_block }}</span><span ng-if="$index < $ctrl.parsedBlocks.length - 1">&nbsp;</span>
        <span class="block-translation" ng-if="$index === $ctrl.currentIndex - 1 && $ctrl.currentIndex > 0">
          {{ b.block_translation }}
        </span>
      </span>
    </div>
  </div>

  <!-- 네비게이션 -->
  <div class="navigation">
    <button class="nav-button"
            ng-click="$ctrl.prevBlock()"
            ng-disabled="$ctrl.currentIndex <= 0">
      ← 이전
    </button>
    <div class="progress-info">{{ $ctrl.currentIndex }} / {{ $ctrl.parsedBlocks.length }}</div>
    <button class="nav-button"
            ng-click="$ctrl.nextBlock()"
            ng-disabled="$ctrl.currentIndex >= $ctrl.parsedBlocks.length">
      다음 →
    </button>
  </div>

  <!-- 현재 블록 분석 정보 -->
  <div class="block current-block" ng-if="$ctrl.currentIndex > 0 && $ctrl.currentIndex <= $ctrl.parsedBlocks.length">
    <div><span class="label">현재 상태</span>{{ $ctrl.parsedBlocks[$ctrl.currentIndex - 1].state }}</div>
    <div><span class="label">예측(문법)</span>{{ $ctrl.parsedBlocks[$ctrl.currentIndex - 1].predict_state }}</div>
    <div><span class="label">예측(내용)</span>{{ $ctrl.parsedBlocks[$ctrl.currentIndex - 1].predict_state2 }}</div>
  </div>
</div>
							`,
  controller: function () {
    var ctrl = this;
    ctrl.currentIndex = 0;

    ctrl.$onChanges = function (changes) {
      if (changes.parsedBlocks && changes.parsedBlocks.currentValue) {
        ctrl.currentIndex = 0;
      }
    };

    ctrl.nextBlock = function () {
      if (ctrl.currentIndex < ctrl.parsedBlocks.length) {
        ctrl.currentIndex++;
      }
    };

    ctrl.prevBlock = function () {
      if (ctrl.currentIndex > 0) {
        ctrl.currentIndex--;
      }
    };
  }
}


(function () {
  angular.module('sentenceApp', [])
    .component('sentenceLearning', sentenceAnalysisComponent)
    .controller('SentenceController', ['$scope', '$http', function ($scope, $http) {
      $scope.text = '';
      $scope.loading = false;
      $scope.error = '';
      $scope.rawResponse = '';
      $scope.parsedBlocks = null;

      function tryParseJson(maybeJson) {
        if (typeof maybeJson !== 'string') {
          return null;
        }

        // Handle markdown code fence format (```json ... ```)
        var jsonMatch = maybeJson.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          try {
            var parsed = JSON.parse(jsonMatch[1].trim());
            if (Array.isArray(parsed)) return parsed;
          } catch (e) {
          }
        }

        // Handle direct JSON string starting with ```json
        if (maybeJson.startsWith('```json')) {
          var jsonContent = maybeJson.substring(7); // Remove '```json'
          jsonContent = jsonContent.replace(/```$/, ''); // Remove trailing ```
          try {
            var parsed = JSON.parse(jsonContent.trim());
            if (Array.isArray(parsed)) return parsed;
          } catch (e) {
          }
        }

        try {
          var parsed = JSON.parse(maybeJson);
          if (Array.isArray(parsed)) return parsed;
          // Some models may wrap with code fences or prepend text, attempt to extract JSON array
          var m = maybeJson.match(/\[\s*\{[\s\S]*\}\s*\]/);
          if (m) {
            var p2 = JSON.parse(m[0]);
            if (Array.isArray(p2)) return p2;
          }
        } catch (e) {
        }
        return null;
      }

      $scope.analyze = function () {
        $scope.error = '';
        $scope.rawResponse = '';
        $scope.parsedBlocks = null;
        var text = ($scope.text || '').trim();
        if (!text) {
          return;
        }
        $scope.loading = true;

        $http.post('/sentence/analysis', {text: text})
          .then(function (res) {
            var data = res && res.data ? res.data : {};
            var content = data.response;
            // Save raw for visibility
            if (typeof content === 'string') {
              $scope.rawResponse = content;
            } else {
              try {
                $scope.rawResponse = JSON.stringify(content, null, 2);
              } catch (_) {
              }
            }
            // Try to parse JSON array
            var blocks = tryParseJson(content);
            if (blocks && Array.isArray(blocks)) {
              $scope.parsedBlocks = blocks;
            }
          })
          .catch(function (err) {
            console.error('Error:', err);
            $scope.error = '오류가 발생했습니다. 다시 시도해주세요.';
          })
          .finally(function () {
            $scope.loading = false;
          });
      };
    }]);
})();
