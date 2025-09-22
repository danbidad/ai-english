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
      let currentSubtitleIndex = -1
      let currentSubtitleIndex2 = -1
      let currentUtterance = null
      let searchParams = new URLSearchParams(window.location.search)
      const videoId = searchParams.get('videoId')

      // 쿠키에서 언어 설정 로드
      $scope.motherLang = localStorage.getItem('motherLang') || 'ko'
      $scope.subtitleLang1 = localStorage.getItem('subtitleLang1') || 'en'
      $scope.subtitleLang2 = localStorage.getItem('subtitleLang2') || 'ko'

      console.log($scope.subtitleLang1, $scope.subtitleLang2)

      $scope.subtitleLangs = [
        {id: 'en', name: 'English'},
        {id: 'ko', name: 'Korean'},
        {id: 'jp', name: 'Japanese'},
      ]

      $scope.languageFlags = {
        'ko': {flag: '🇰🇷', name: '한국어'},
        'en': {flag: '🇺🇸', name: '영어'},
        'ja': {flag: '🇯🇵', name: '일본어'},
        'zh': {flag: '🇨🇳', name: '중국어'},
        'es': {flag: '🇪🇸', name: '스페인어'},
        'fr': {flag: '🇫🇷', name: '프랑스어'},
        'de': {flag: '🇩🇪', name: '독일어'},
        'ru': {flag: '🇷🇺', name: '러시아어'},
        'pt': {flag: '🇵🇹', name: '포르투갈어'},
        'it': {flag: '🇮🇹', name: '이탈리아어'},
        'ar': {flag: '🇸🇦', name: '아랍어'},
        'hi': {flag: '🇮🇳', name: '힌디어'},
        'vi': {flag: '🇻🇳', name: '베트남어'},
        'th': {flag: '🇹🇭', name: '태국어'}
      }

      $scope.youtubeUrl = ''
      $scope.videoId = ''
      $scope.errorMessage = ''
      $scope.isPlaying = false
      $scope.currentTime = 5

      $scope.motherLang = 'ko'
      $scope.subtitles1 = []
      $scope.subtitles2 = []

      $scope.subtitle1 = null
      $scope.subtitle2 = null

      $scope.selectedWord = null
      $scope.wordMeanings = []
      $scope.popupStyle = {}
      $scope.ttsLoading = false

      $scope.loadVideo = loadVideo
      $scope.togglePlay = togglePlay
      $scope.isCurrentSubtitle = isCurrentSubtitle
      $scope.seekToTime = seekToTime
      $scope.splitWords = splitWords
      $scope.showWordMeaning = showWordMeaning
      $scope.playTTS = playTTS
      $scope.formatTime = formatTime
      $scope.saveOptions = saveOptions

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
            'onStateChange': onPlayerStateChange,
            'onReady': onPlayerReady,
            'onApiChange': onApiChange
          }
        })

        function onApiChange(event) {
          // 강제로 영어 캡션으로 바꿈. 캡션이 없으면 자동 생성 영어 캡션을 사용함
          player.setOption('captions', 'track', { languageCode: 'en' }); // 영어
        }

        function onPlayerReady(event) {
          // 플레이어가 준비되면 시간 업데이트 타이머 시작
          startTimeUpdate()
        }

        function startTimeUpdate() {
          if (timeUpdateInterval) {
            $interval.cancel(timeUpdateInterval)
          }
          timeUpdateInterval = $interval(function () {
            if (player && player.getCurrentTime) {
              $scope.currentTime = player.getCurrentTime()
              updateCurrentSubtitle($scope.currentTime)
            }
          }, 100)
        }

        function updateCurrentSubtitle(currentTime) {
          // 첫 번째 자막 트랙 처리
          let newSubtitleIndex1 = -1
          let foundSubtitle1 = null

          if ($scope.subtitles1 && $scope.subtitles1.length > 0) {
            for (let i = 0; i < $scope.subtitles1.length; i++) {
              const subtitle = $scope.subtitles1[i]
              const start = parseFloat(subtitle.start)
              const duration = parseFloat(subtitle.dur)

              // 현재 시간이 자막의 시작과 끝 사이에 있는지 확인
              if (start <= currentTime && currentTime <= (start + duration)) {
                newSubtitleIndex1 = i
                foundSubtitle1 = subtitle
                break
              }
            }
          }

          // 두 번째 자막 트랙 처리
          let newSubtitleIndex2 = -1
          let foundSubtitle2 = null

          if ($scope.subtitles2 && $scope.subtitles2.length > 0) {
            for (let i = 0; i < $scope.subtitles2.length; i++) {
              const subtitle = $scope.subtitles2[i]
              const start = parseFloat(subtitle.start)
              const duration = parseFloat(subtitle.dur)

              // 현재 시간이 자막의 시작과 끝 사이에 있는지 확인
              if (start <= currentTime && currentTime <= (start + duration)) {
                newSubtitleIndex2 = i
                foundSubtitle2 = subtitle
                break
              }
            }
          }

          // 첫 번째 자막이 바뀌었고 유효한 자막이 있을 때만 스크롤 및 업데이트
          if (newSubtitleIndex1 !== currentSubtitleIndex && newSubtitleIndex1 !== -1) {
            currentSubtitleIndex = newSubtitleIndex1
            if (foundSubtitle1) {
              $scope.subtitle1 = foundSubtitle1.text
            }
          } else if (newSubtitleIndex1 === -1) {
            // 현재 자막이 없는 경우
            $scope.subtitle1 = null
          }

          // 두 번째 자막 트랙 업데이트
          if (foundSubtitle2) {
            $scope.subtitle2 = foundSubtitle2.text

            // 두 번째 자막이 바뀌었을 때만 업데이트
            if (newSubtitleIndex2 !== currentSubtitleIndex2) {
              currentSubtitleIndex2 = newSubtitleIndex2
            }
          } else {
            $scope.subtitle2 = null
            currentSubtitleIndex2 = -1
          }
        }

        function onPlayerStateChange(event) {
          $scope.$apply(function () {
            $scope.isPlaying = event.data === YT.PlayerState.PLAYING
          })
        }

        function scrollToSubtitle(index) {
          const subtitleElement = document.getElementById(`subtitle-${index}`)
          if (subtitleElement) {
            //subtitleElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
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
              fetchSubtitles()
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
          try {
            const response = await $http.get(`/youtube/info/${videoId}/en`)

            console.log(response.data)

            if (response.data.subtitles_list) {
              return response.data.subtitles_list
            } else {
              console.log('지원되는 자막 언어가 없습니다.')
              return null
            }
          } catch (error) {
            console.error('자막 목록 가져오기 오류:', error)
            return null
          }
        }

        function fetchSubtitles() {
          let subtitles1 = $scope.subtitlesList.find((subtitles) => subtitles.vssId==='.'+$scope.subtitleLang1) || $scope.subtitlesList.find((subtitles) => subtitles.vssId==='a.'+$scope.subtitleLang1)
          let subtitles2 = $scope.subtitlesList.find((subtitles) => subtitles.vssId==='.'+$scope.subtitleLang2) || $scope.subtitlesList.find((subtitles) => subtitles.vssId==='a.'+$scope.subtitleLang2)

          function SubtitleXMLtoJSON(xml) {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xml, "text/xml");

            return Array.from(xmlDoc.getElementsByTagName('text')).map(node => ({
              start: parseFloat(node.getAttribute('start')),
              dur: parseFloat(node.getAttribute('dur')),
              text: node.textContent
            }));
          }

          if (subtitles1)
            $http.get(`/proxy/trans/` + decodeURIComponent(subtitles1.baseUrl))
              .then(function (response) {
                if (response.data) {
                  $scope.subtitles1 = SubtitleXMLtoJSON(response.data)
                  currentSubtitleIndex1 = -1
                  console.log($scope.subtitleLang1)
                } else {
                  console.log($scope.subtitleLang1 + '자막이 없습니다.')
                }
              })
              .catch(function (error) {
                console.error('자막 가져오기 오류:', error)
              })

          if (subtitles2)
            $http.get(`/proxy/` + decodeURIComponent(subtitles2.baseUrl))
              .then(function (response) {
                if (response.data) {
                  $scope.subtitles2 = SubtitleXMLtoJSON(response.data)
                  currentSubtitleIndex2 = -1
                  console.log($scope.subtitleLang2)
                } else {
                  console.log($scope.subtitleLang2 + '자막이 없습니다.')
                }
              })
              .catch(function (error) {
                console.error('자막 가져오기 오류:', error)
              })
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

      function saveOptions() {
        console.log('saveOptions()')
        localStorage.setItem('motherLang', $scope.motherLang)
        localStorage.setItem('subtitleLang1', $scope.subtitleLang1)
        localStorage.setItem('subtitleLang2', $scope.subtitleLang2)
        closeOptionDialog()
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
