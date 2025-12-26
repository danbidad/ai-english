angular.module('youtubeApp', ['ngCookies'])
  .filter('formatDuration', function () {
    return function (seconds) {
      if (!seconds) return '00:00'
      const minutes = Math.floor(seconds / 60)
      const remainingSeconds = Math.floor(seconds % 60)
      return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
    }
  })
  .config(['$sceDelegateProvider', function ($sceDelegateProvider) {
    $sceDelegateProvider.resourceUrlWhitelist([
      'self',
      'https://www.youtube.com/**',
      'https://www.youtube-nocookie.com/**',
      'https://youtu.be/**'
    ])
  }])
  .controller('YoutubeController', ['$scope', '$window', '$http', '$interval', '$location', '$cookies',
    function ($scope, $window, $http, $interval, $location, $cookies) {
      let player
      let timeUpdateInterval
      let currentUtterance = null
      let searchParams = new URLSearchParams(window.location.search)
      const videoId = searchParams.get('videoId')

      // motherLang 초기화 (쿠키 > 브라우저 > 기본값)
      const cookieMotherLang = $cookies.get('motherLang');
      const browserLang = ($window.navigator.language || $window.navigator.userLanguage || 'ko').split('-')[0];
      $scope.motherLang = cookieMotherLang || browserLang;

      // subLang 초기화 (쿠키 > 기본값)
      const cookieSubLang = $cookies.get('subLang');
      $scope.subLang = cookieSubLang || 'en';

      console.log(`[Language Setup] Mother Language: ${$scope.motherLang} (Cookie: ${cookieMotherLang}, Browser: ${browserLang})`);
      console.log(`[Language Setup] Subtitle Language: ${$scope.subLang} (Cookie: ${cookieSubLang}, Default: en)`);

      // 결정된 언어 설정을 쿠키에 저장합니다.
      $cookies.put('motherLang', $scope.motherLang);
      $cookies.put('subLang', $scope.subLang);

      $scope.subtitleLangs = [
        { id: 'en', name: 'English' },
        { id: 'ko', name: 'Korean' },
        { id: 'jp', name: 'Japanese' },
      ]

      $scope.languageFlags = {
        'ko': { flag: '🇰🇷', name: '한국어' },
        'en': { flag: '🇺🇸', name: '영어' },
        'ja': { flag: '🇯🇵', name: '일본어' },
        'zh': { flag: '🇨🇳', name: '중국어' },
        'es': { flag: '🇪🇸', name: '스페인어' },
        'fr': { flag: '🇫🇷', name: '프랑스어' },
        'de': { flag: '🇩🇪', name: '독일어' },
        'ru': { flag: '🇷🇺', name: '러시아어' },
        'pt': { flag: '🇵🇹', name: '포르투갈어' },
        'it': { flag: '🇮🇹', name: '이탈리아어' },
        'ar': { flag: '🇸🇦', name: '아랍어' },
        'hi': { flag: '🇮🇳', name: '힌디어' },
        'vi': { flag: '🇻🇳', name: '베트남어' },
        'th': { flag: '🇹🇭', name: '태국어' }
      }

      $scope.youtubeUrl = ''
      $scope.videoId = ''
      $scope.errorMessage = ''
      $scope.isPlaying = false
      $scope.currentTime = 5
      $scope.autostop = false
      $scope.targetAutoStopTime = -1
      $scope.autoStopHandled = false

      $scope.motherLang = 'ko'
      $scope.subLang = 'en'
      $scope.subtitles1 = []
      $scope.subtitles2 = []

      $scope.subtitle1 = null
      $scope.subtitle2 = null
      $scope.currentSubtitleIndex = -1
      $scope.currentSubtitleIndex2 = -1

      $scope.selectedWord = null
      $scope.wordMeanings = []
      $scope.popupStyle = {}
      $scope.ttsLoading = false

      $scope.togglePlay = togglePlay
      $scope.isCurrentSubtitle = isCurrentSubtitle
      $scope.seekToTime = seekToTime
      $scope.splitWords = splitWords
      $scope.showWordMeaning = showWordMeaning
      $scope.playTTS = playTTS
      $scope.formatTime = formatTime
      $scope.formatTime = formatTime
      $scope.saveOptions = saveOptions
      $scope.openOptionDialog = openOptionDialog
      $scope.closeDropdown = function () { document.activeElement.blur() }

      // YouTube API 준비
      $window.onYouTubeIframeAPIReady = function () {
        console.log('YouTube API Ready')
      }

      // 페이지를 떠날 때 음성 정리
      $window.onbeforeunload = function () {
        if (speechSynthesis.speaking) {
          speechSynthesis.cancel()
        }
      }

      $scope.isSpeechSupported = 'speechSynthesis' in window

      // 문서 클릭시 팝업 닫기
      angular.element($window).on('click', function () {
        $scope.$apply(function () {
          $scope.selectedWord = null
          $scope.wordMeanings = ''
        })
      })

      // 컨트롤러가 소멸될 때 타이머 정리
      $scope.$on('$destroy', function () {
        if (timeUpdateInterval) {
          $interval.cancel(timeUpdateInterval)
        }
      })

      if (videoId) {
        console.log(videoId)
        loadVideo(videoId)
      }

      function createPlayer(videoId) {
        if (player) {
          player.destroy()
          if (timeUpdateInterval) {
            $interval.cancel(timeUpdateInterval)
          }
        }

        player = new YT.Player('player', {
          height: '100%',
          width: '100%',
          videoId: videoId,
          //host: 'https://www.youtube-nocookie.com', // no-cookie로 설정할 경우 초기 로딩이 자주 실패함 (리로드하면 해결됨)
          host: 'https://www.youtube.com',
          playerVars: {
            'enablejsapi': 1,
            'origin': window.location.origin,
            'controls': 1,
            'modestbranding': 1,
            'rel': 0,
            'showinfo': 0,
            'loop': 0,
            'playlist': videoId,
            'cc_load_policy': 0,
            'autoplay': 0,
            'cc_lang_pref': 'en',
            'hl': 'en'
          },
          events: {
            'onStateChange': onYTPlayerStateChange,
            'onReady': onYTPlayerReady,
            'onApiChange': onYTApiChange
          }
        })

        function onYTApiChange(event) {
          // 강제로 영어 캡션으로 바꿈. 캡션이 없으면 자동 생성 영어 캡션을 사용함
          player.setOption('captions', 'track', { languageCode: 'en' }); // 영어
        }

        function onYTPlayerReady(event) {
          // 플레이어가 준비되면 시간 업데이트 타이머 시작
          startYTTimeUpdate()
        }

        function startYTTimeUpdate() {
          if (timeUpdateInterval) {
            $interval.cancel(timeUpdateInterval)
          }
          timeUpdateInterval = $interval(function () {
            if (player && player.getCurrentTime) {
              $scope.currentTime = player.getCurrentTime()
              updateCurrentSubtitle($scope.currentTime)

              // Autostop Logic
              if ($scope.autostop && $scope.isPlaying && $scope.targetAutoStopTime !== -1 && !$scope.autoStopHandled) {
                // Check if we reached the stop time
                if ($scope.currentTime >= $scope.targetAutoStopTime) {
                  // Tolerance check: if we are WAY past the stop time (e.g. user seeked), don't stop
                  if ($scope.currentTime - $scope.targetAutoStopTime < 2.0) {
                    player.pauseVideo();
                    $scope.autoStopHandled = true; // Mark as handled for this subtitle
                    console.log(`[Autostop] Paused at ${$scope.currentTime} (Target: ${$scope.targetAutoStopTime})`);
                  } else {
                    // We are too far past, assume user seeked or something. Reset logic for next sub?
                    // Actually, if we are far past, we just ignore this specific stop target.
                    // It will be updated when the next subtitle starts (which might have already happened).
                  }
                }
              }
            }
          }, 100)
        }

        function findCurPosInSubtitles(curTime, subtitles) {
          if (subtitles && subtitles.length > 0) {
            for (let i = 0; i < subtitles.length; i++) {
              const subtitle = subtitles[i]
              const start = parseFloat(subtitle.start)
              const duration = parseFloat(subtitle.dur)

              // 현재 시간이 자막의 시작과 끝 사이에 있는지 확인
              if (start <= curTime && curTime <= (start + duration)) {
                return i
              }
            }
          }

          return -1
        }

        function updateCurrentSubtitle(currentTime) {
          let newSubtitleIndex1 = findCurPosInSubtitles(currentTime, $scope.subtitles1)
          let newSubtitleIndex2 = findCurPosInSubtitles(currentTime, $scope.subtitles2)

          // 첫 번째 자막이 바뀌었고 유효한 자막이 있을 때만 스크롤 및 업데이트
          if (newSubtitleIndex1 !== $scope.currentSubtitleIndex1) {
            if (newSubtitleIndex1 !== -1) {
              $scope.currentSubtitleIndex1 = newSubtitleIndex1
              $scope.subtitle1 = $scope.subtitles1[newSubtitleIndex1]
              $scope.subtitle1_pre = $scope.subtitle1_next = null
              if (newSubtitleIndex1 > 0)
                $scope.subtitle1_pre = $scope.subtitles1[newSubtitleIndex1 - 1]
              if (newSubtitleIndex1 < $scope.subtitles1.length - 1)
                $scope.subtitle1_next = $scope.subtitles1[newSubtitleIndex1 + 1]

              // Calculate Autostop Target Time
              if ($scope.subtitle1) {
                const currentEnd = parseFloat($scope.subtitle1.start) + parseFloat($scope.subtitle1.dur);
                let nextStart = 999999; // Far future if no next subtitle
                if ($scope.subtitle1_next) {
                  nextStart = parseFloat($scope.subtitle1_next.start);
                }

                // Stop 1 second after current ends, OR before next starts (whichever is sooner)
                $scope.targetAutoStopTime = Math.min(currentEnd + 1.0, nextStart);
                $scope.autoStopHandled = false; // Reset handled flag for new subtitle
                console.log(`[Autostop] New target set: ${$scope.targetAutoStopTime} (End: ${currentEnd}, Next: ${nextStart})`);
              } else {
                $scope.targetAutoStopTime = -1;
              }
            } else {
              $scope.subtitle1 = null
            }
          }

          if (newSubtitleIndex2 !== $scope.currentSubtitleIndex2) {
            if (newSubtitleIndex2 !== -1) {
              $scope.currentSubtitleIndex2 = newSubtitleIndex2
              $scope.subtitle2 = $scope.subtitles2[newSubtitleIndex2]
            } else {
              $scope.subtitle2 = null
            }
          }
        }

        function onYTPlayerStateChange(event) {
          $scope.$apply(function () {
            $scope.isPlaying = event.data === YT.PlayerState.PLAYING
          })
        }
      }

      function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60)
        const remainingSeconds = Math.floor(seconds % 60)
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
      }

      function loadVideo(videoId) {
        if (videoId) {
          $scope.videoId = videoId
          $scope.errorMessage = ''
          $scope.subtitlesList = null
          setTimeout(() => createPlayer(videoId), 100)
          fetchSubtitlesList(videoId).then(function (subtitlesList) {
            console.log(subtitlesList)
            if (subtitlesList) {
              $scope.subtitlesList = subtitlesList
              // fetchSubtitles() // Removed: Subtitles are now fetched with the list
            } else
              alert('자막이 없는 영상입니다.')
          }).catch(function (error) {
            alert('자막 목록을 가져오는데 실패했습니다. 다시 시도해주세요.')
            console.error('자막 목록 가져오기 오류:', error)
          })
        } else {
          $scope.videoId = ''
          $scope.errorMessage = '유효한 유튜브 URL을 입력하세요.'
        }

        async function fetchSubtitlesList(videoId) {
          const url = `/youtube/subtitle_list/${videoId}?lang=${$scope.motherLang}&&lang2=${$scope.subLang}`;
          console.log(`[fetchSubtitlesList] Requesting subtitle list for videoId: ${videoId}`);
          console.log(`[fetchSubtitlesList] Mother Lang: ${$scope.motherLang}, Sub Lang: ${$scope.subLang}`);
          console.log(`[fetchSubtitlesList] Full URL: ${url}`);

          try {
            // 자막 목록 요청
            const response = await $http.get(url)

            // 응답 데이터 유효성 검사
            if (!response.data) {
              console.error('[fetchSubtitlesList] No response data received.');
              return null
            }

            // 응답 데이터 구조 확인
            const subtitlesList = response.data.subtitles || response.data
            if (!Array.isArray(subtitlesList)) {
              console.error('[fetchSubtitlesList] Invalid subtitle data format:', subtitlesList);
              return null
            }

            if (subtitlesList.length === 0) {
              console.warn('[fetchSubtitlesList] No subtitles found in the list.');
              return null
            }

            // 자막 목록 처리 결과
            console.log(`[fetchSubtitlesList] Success! Found ${subtitlesList.length} subtitles in list.`);

            // 자막 데이터 처리 (서버에서 함께 반환됨)
            if (response.data.subtitles && response.data.subtitles.length > 0) {
              console.log(`[fetchSubtitlesList] Processing Subtitles 1 (${$scope.motherLang}). Count: ${response.data.subtitles.length}`);
              $scope.subtitles1 = response.data.subtitles.map(sub => ({
                start: parseFloat(sub.start),
                dur: parseFloat(sub.dur),
                text: sub.text
              }));
              currentSubtitleIndex = -1;
              console.log(`[fetchSubtitlesList] Subtitles 1 loaded successfully.`);
            } else {
              console.warn(`[fetchSubtitlesList] No subtitles found for Lang1 (${$scope.motherLang}).`);
              $scope.subtitles1 = [];
            }

            if (response.data.subtitles2 && response.data.subtitles2.length > 0) {
              console.log(`[fetchSubtitlesList] Processing Subtitles 2 (${$scope.subLang}). Count: ${response.data.subtitles2.length}`);
              $scope.subtitles2 = response.data.subtitles2.map(sub => ({
                start: parseFloat(sub.start),
                dur: parseFloat(sub.dur),
                text: sub.text
              }));
              currentSubtitleIndex2 = -1;
              console.log(`[fetchSubtitlesList] Subtitles 2 loaded successfully.`);
            } else {
              console.warn(`[fetchSubtitlesList] No subtitles found for Lang2 (${$scope.subLang}).`);
              $scope.subtitles2 = [];
            }

            return subtitlesList

          } catch (error) {
            console.error('[fetchSubtitlesList] Error fetching subtitle list:', error);
            if (error.data) {
              console.error('[fetchSubtitlesList] Error details:', error.data);
            }
            return null
          }
        }


      }

      function togglePlay() {
        if (!player) return

        if ($scope.isPlaying) {
          player.pauseVideo()
        } else {
          player.playVideo()
        }
      }

      function isCurrentSubtitle(subtitle) {
        const start = parseFloat(subtitle.start)
        const duration = parseFloat(subtitle.dur)
        // 현재 시간이 자막의 시작과 끝 사이에 있는지 확인
        return start <= $scope.currentTime && $scope.currentTime <= (start + duration)
      }

      function seekToTime(seconds) {
        if (player && player.seekTo) {
          player.seekTo(seconds, true)

          // 일시정지 상태였다면 재생 시작
          if (!$scope.isPlaying) {
            player.playVideo()
          }
        }
      }

      function splitWords(text) {
        return text ? text.split(/\s+/) : []
      }

      function splitWords2(text) {
      }

      function showWordMeaning(event, word) {
        // 기존 팝업 닫기
        event.stopPropagation()

        // 영어 단어인지 확인 (숫자나 특수문자 제외)
        if (!/^[a-zA-Z]+$/.test(word)) {
          return
        }

        // 팝업 위치 설정
        const rect = event.target.getBoundingClientRect()
        $scope.popupStyle = {
          left: rect.left + 'px',
          top: (rect.bottom + 5) + 'px'
        }

        // 단어 의미 가져오기
        $http.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`)
          .then(function (response) {
            $scope.selectedWord = word
            $scope.wordMeanings = response.data[0].meanings
          })
          .catch(function (error) {
            console.error('단어 검색 오류:', error)
          })
      }

      function openOptionDialog() {
        $scope.tempOptions = {
          motherLang: $scope.motherLang,
          subLang: $scope.subLang,
          autostop: $scope.autostop
        };
        document.getElementById('option_modal').showModal();
      }

      function saveOptions() {
        $scope.motherLang = $scope.tempOptions.motherLang;
        $scope.subLang = $scope.tempOptions.subLang;
        $scope.autostop = $scope.tempOptions.autostop;

        $cookies.motherLang = $scope.motherLang;
        $cookies.subLang = $scope.subLang;
        // We could save autostop to cookies too if we wanted, but not strictly requested yet.
        // Let's stick to the plan: just update scope.

        closeOptionDialog();
      }

      function playTTS(text, event, index) {
        if (!$scope.isSpeechSupported) return

        event.stopPropagation()
        const icon = event.target

        // 이전 재생 중인 음성이 있다면 중지
        if (speechSynthesis.speaking) {
          speechSynthesis.cancel()
          if (currentUtterance === text) {
            currentUtterance = null
            return
          }
        }

        currentUtterance = text
        const utterance = setupUtterance(text)

        utterance.lang = "en-US"
        const voices = window.speechSynthesis.getVoices()

        console.log(voices)

        // 영어 음성 필터링 및 설정
        const englishVoices = voices.reduce((acc, cur) => {
          if (cur.lang === 'en-US') acc.push(cur)
          return acc
        }, [])
        if (englishVoices[index]) {
          utterance.voice = englishVoices[index]
        }
        console.log(englishVoices)

        // 재생 상태 표시
        icon.classList.add('speaking')

        utterance.onend = function () {
          $scope.$apply(function () {
            icon.classList.remove('speaking')
            currentUtterance = null
          })
        }

        utterance.onerror = function () {
          $scope.$apply(function () {
            icon.classList.remove('speaking')
            currentUtterance = null
          })
        }

        speechSynthesis.speak(utterance)

        // 음성 설정
        function setupUtterance(text) {
          const utterance = new SpeechSynthesisUtterance(text)
          utterance.lang = 'en-US'
          utterance.rate = 0.9  // 속도 조절
          utterance.pitch = 1   // 음높이

          // 영어 음성 선택 (가능한 경우)
          const voices = speechSynthesis.getVoices()
          const englishVoice = voices.find(voice =>
            voice.lang.includes('en') && voice.name.includes('Female'))
          if (englishVoice) {
            utterance.voice = englishVoice
          }

          return utterance
        }
      }
    }])
