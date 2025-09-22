var app = angular.module('multilingualApp', ['ngCookies'])

app.controller('LanguageController', ['$scope', '$cookies', '$window', function ($scope, $cookies, $window) {
    initMultiLanguage($scope)

    $scope.youtubeQuery = ''
    $scope.searchPerformed = false
    $scope.searchError = false
    $scope.searchResults = []
    $scope.isLoading = false
    $scope.browserLang = detectBrowserLanguage()
    $scope.searchYoutube = searchYoutube
    $scope.changeLanguage = changeLanguage

    {
        var cookieLang = getLanguageFromCookie()

        // 사용할 언어 결정 (쿠키 > 브라우저 설정 > 기본값)
        if ( cookieLang && $scope.languages[cookieLang] ) {
            $scope.currentLang = cookieLang
        } else {
            $scope.currentLang = $scope.browserLang
        }
    }

    // html lang 속성 설정
    document.documentElement.lang = $scope.currentLang

    // 페이지 제목 설정
    if ( $scope.translations[$scope.currentLang] ) {
        document.title = $scope.translations[$scope.currentLang].youtubeSearchTitle
    }


    function gotoPlayerPage(videoId) {
        window.location.href = `youtube.html?videoId=${encodeURIComponent(videoId)}`
    }

    // Method to simulate YouTube Search without using YouTube API Key
    async function searchYoutube() {
        let searchQuery = $scope.youtubeQuery

        if ( !searchQuery ) {
            console.error('Search query is empty.')
            $scope.searchResults = []
            $scope.$apply()
            return
        }

        // 입력값이 URL 형태인지 확인
        if ( _isYoutubeUrl(searchQuery) ) {
            let videoId = extractYoutubeVideoID(searchQuery)
            if ( videoId )
                axios.get(`/youtube/info/${videoId}`, {})
                    .then(response => {
                        gotoPlayerPage(videoId)
                    })
                    .catch(error => {
                        showErrorMessage('오류가 발생했습니다: ' + error.message)
                    })
        } else {
            // URL이 아니라면 일반 검색어로 처리
            _performSearch(searchQuery)
        }

        function _isYoutubeUrl(input) {
            // 유튜브 URL 패턴 검사 (예: https://www.youtube.com/watch?v=XXXXXXXXXXX 또는 https://youtu.be/XXXXXXXXXXX)
            const youtubePattern = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/i
            return youtubePattern.test(input)
        }

        function _performSearch(query) {
            $scope.loading = true
            axios.get('/youtube/search', {
                params: {
                    q: query,
                    loc: $scope.currentLang,
                    maxResults: 20
                }
            })
                .then(response => {
                    // 로딩 상태 숨김
                    const { results } = response.data

                    if ( results && results.length > 0 ) {
                        $scope.searchResults = results
                        $scope.$digest()
                    }
                })
                .catch(error => {
                    console.error('YouTube 검색 중 오류 발생:', error)

                    // 로딩 상태 숨김
                    if ( loadingElement ) loadingElement.style.display = 'none'

                    // 에러 메시지 표시
                    showMessage('검색 중 오류가 발생했습니다.', 'error')
                })
        }

        function showErrorMessage(message) {
            // 오류 메시지를 화면에 표시하는 기능
            const errorElement = document.getElementById('errorMessage')
            if ( errorElement ) {
                errorElement.textContent = message
                errorElement.style.display = 'block'
            } else {
                alert(message)
            }
        }
    }

    function detectBrowserLanguage() {
        var browserLang = $window.navigator.language || $window.navigator.userLanguage
        // 언어 코드만 추출 (예: 'en-US'에서 'en')
        var langCode = browserLang.split('-')[0]
        let finalLangCode

        // 전체 코드가 지원되는 경우 (예: zh-TW)
        if ( $scope.languages[browserLang] ) {
            finalLangCode = browserLang
        }
        // 기본 언어 코드만 지원되는 경우
        else if ( $scope.languages[langCode] ) {
            finalLangCode = langCode
        }
        // 지원되지 않는 경우 영어로 기본 설정
        else {
            finalLangCode = 'en'
        }

        moveLanguageToFront(finalLangCode)
        return finalLangCode

        function moveLanguageToFront(langCode) {
            if ( $scope.languages[langCode] ) {
                const languagesArray = Object.entries($scope.languages)
                const movedLanguage = languagesArray.find(([key]) => key === langCode)

                // 기존 배열에서 해당 언어를 제거한 후 맨 앞에 추가
                const updatedLanguages = [movedLanguage, ...languagesArray.filter(([key]) => key !== langCode)]
                $scope.languages = Object.fromEntries(updatedLanguages)
            }
        }
    }

    function getLanguageFromCookie() {
        return $cookies.get('preferredLanguage')
    }

    function changeLanguage(langCode) {
        if ( $scope.languages[langCode] ) {
            $scope.currentLang = langCode
            $cookies.put('preferredLanguage', langCode, {
                expires: new Date(new Date().getTime() + 365 * 24 * 60 * 60 * 1000) // 1년 유효
            })
            document.documentElement.lang = langCode
            // 페이지 제목 업데이트
            document.title = $scope.translations[langCode].youtubeSearchTitle
        }
    }
}])
