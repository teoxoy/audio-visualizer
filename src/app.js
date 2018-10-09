import 'normalize.css'
import './style.styl'
import * as PIXI from 'pixi.js'
import demoSongs from './demo-songs/*.mp3'

const MARGIN = 8
let trippyMode = false
const rad15deg = Math.PI / 12
let smallerSide = Math.min(window.innerWidth, window.innerHeight)

PIXI.Graphics.CURVES.adaptive = true
PIXI.Graphics.CURVES.maxLength = 5

const app = new PIXI.Application({
    view: document.getElementById('canvas'),
    antialias: true,
    resolution: window.devicePixelRatio
})
app.renderer.autoResize = true
app.renderer.resize(window.innerWidth, window.innerHeight)
window.addEventListener('resize', () => {
    app.renderer.resize(window.innerWidth, window.innerHeight)
    smallerSide = Math.min(window.innerWidth, window.innerHeight)
}, false)

app.ticker.speed = 2

const graphics = new PIXI.Graphics()
app.stage.addChild(graphics)

const UI = document.getElementById('ui')
function toggleUI() {
    if (!UI.style.visibility || UI.style.visibility === 'visible') UI.style.visibility = 'hidden'
    else UI.style.visibility = 'visible'
}
document.addEventListener('keydown', e => { if (e.keyCode === 72) toggleUI() })

let audioSrc
const audioCtx = new AudioContext()

document.getElementById('record').onclick = e => {
    if (audioSrc === undefined || audioSrc instanceof MediaElementAudioSourceNode) {
        if (navigator.mediaDevices) {
            navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
                if (activeSong) activeSong.classList.remove('active')
                activeSong = e.target
                e.target.classList.add('active')

                audioEl.pause()
                if (audioSrc !== undefined) audioSrc.disconnect()
                audioSrc = audioCtx.createMediaStreamSource(stream)
                audioSrc.connect(lowFilter)
                audioSrc.connect(highFilter)
            }).catch(err => {
                console.log('The following gUM error occured: ' + err)
            })
        } else {
            console.log('getUserMedia not supported on your browser!')
        }
    }
}

const audioEl = document.createElement('audio')
const MEASN = audioCtx.createMediaElementSource(audioEl)
document.body.appendChild(audioEl)

let activeSong

document.getElementById('songs').childNodes.forEach(c => {
    c.addEventListener('pointerdown', () => {
        if (activeSong) activeSong.classList.remove('active')
        activeSong = c
        c.classList.add('active')
        audioEl.src = demoSongs[c.dataset.id]
        audioEl.play()
        if (audioSrc === undefined || audioSrc instanceof MediaStreamAudioSourceNode) {
            if (audioSrc !== undefined) audioSrc.disconnect()
            audioSrc = MEASN
            audioSrc.connect(lowFilter)
            audioSrc.connect(highFilter)
            audioSrc.connect(audioCtx.destination)
        }
    })
})

document.getElementById('trippy').onclick = e => {
    trippyMode = !trippyMode
    if (trippyMode) {
        e.target.classList.add('active')

        lowAnalyzer.smoothingTimeConstant = 0.8
        highAnalyzer.smoothingTimeConstant = 0.88
    } else {
        e.target.classList.remove('active')

        lowAnalyzer.smoothingTimeConstant = 0.89
        highAnalyzer.smoothingTimeConstant = 0.87
    }
}

const lowAnalyzer = audioCtx.createAnalyser()
lowAnalyzer.minDecibels = -80
lowAnalyzer.maxDecibels = -20
lowAnalyzer.fftSize = 32
lowAnalyzer.smoothingTimeConstant = 0.89
const lowFrequencyData = new Uint8Array(lowAnalyzer.frequencyBinCount)

const highAnalyzer = audioCtx.createAnalyser()
highAnalyzer.minDecibels = -80
highAnalyzer.maxDecibels = -20
highAnalyzer.fftSize = 32
highAnalyzer.smoothingTimeConstant = 0.87
const highFrequencyData = new Uint8Array(highAnalyzer.frequencyBinCount)

const lowFilter = audioCtx.createBiquadFilter()
lowFilter.type = 'lowpass'
lowFilter.frequency.setValueAtTime(200, 0)

const highFilter = audioCtx.createBiquadFilter()
highFilter.type = 'highpass'
highFilter.frequency.setValueAtTime(200, 0)

lowFilter.connect(lowAnalyzer)
highFilter.connect(highAnalyzer)

app.ticker.add(() => {
    graphics.clear()

    lowAnalyzer.getByteFrequencyData(lowFrequencyData)
    highAnalyzer.getByteFrequencyData(highFrequencyData)

    graphics.lineStyle(1.5, 0x009688)
    for (let i = 0; i < lowFrequencyData.length; i++) {
        if (lowFrequencyData[i] !== 0) {
            const R = lowFrequencyData[i] * smallerSide / 512
            if (trippyMode) graphics.lineStyle(1.5, 0xFFFFFF * Math.random())
            drawArcV1(R, 1, 5)
            drawArcV1(R, 7, 11)
            drawArcV1(R, 13, 17)
            drawArcV1(R, 19, 23)
        }
    }

    graphics.lineStyle(1.5, 0xFF9800)
    for (let i = 0; i < highFrequencyData.length; i++) {
        if (highFrequencyData[i] !== 0) {
            const R = highFrequencyData[i] * smallerSide / 1024
            if (trippyMode) graphics.lineStyle(1.5, 0xFFFFFF * Math.random())
            drawArcV2(i, R, 1, 5)
            drawArcV2(i, R, 7, 11)
            drawArcV2(i, R, 13, 17)
            drawArcV2(i, R, 19, 23)
        }
    }
})

function drawArcV1(r, a, b) {
    const v = (0.75 - r / (smallerSide / 2 - MARGIN))
    const A = rad15deg * a + v
    const B = rad15deg * b - v
    if (B > A) {
        drawArc(r, A, B)
    }
}

function drawArcV2(i, r, a, b) {
    drawArc(r, rad15deg * (a + i), rad15deg * (b + i), true)
}

function drawArc(radius, startAngle, endAngle, spikes = false) {
    const X = window.innerWidth / 2
    const Y = window.innerHeight / 2
    const startX = X + (Math.cos(startAngle) * (radius - MARGIN))
    const startY = Y + (Math.sin(startAngle) * (radius - MARGIN))
    graphics.moveTo(startX, startY)
    graphics.arc(X, Y, radius - MARGIN - (spikes ? 4 : 0), startAngle, endAngle)
}
