import 'normalize.css'
import * as PIXI from 'pixi.js'

let smallerSide = Math.min(window.innerWidth, window.innerHeight)
const rad15deg = Math.PI / 12

const app = new PIXI.Application({
    antialias: true,
    resolution: window.devicePixelRatio
})
app.renderer.view.style.position = 'absolute'
app.renderer.view.style.display = 'block'
app.renderer.autoResize = true
app.renderer.resize(window.innerWidth, window.innerHeight)
window.addEventListener('resize', () => {
    app.renderer.resize(window.innerWidth, window.innerHeight)
    smallerSide = Math.min(window.innerWidth, window.innerHeight)
    copyrightText.position.y = app.renderer.height
}, false)
document.body.appendChild(app.view)

const graphics = new PIXI.Graphics()
app.stage.addChild(graphics)

const UI = new PIXI.Container()
app.stage.addChild(UI)

const copyrightText = new PIXI.Text(' Copyright © 2018 Tanasoaia Teodor Andrei\n All audio assets used in this project belong to their respective artists and are subject to the Creative Commons License')
copyrightText.anchor.set(0, 1)
copyrightText.position.y = app.renderer.height
copyrightText.style.fill = 0xFFFFFF
copyrightText.style.fontSize = 12
UI.addChild(copyrightText)

const hideText = new PIXI.Text('Press H to hide the UI')
hideText.anchor.set(1, 0)
hideText.position.set(app.renderer.width - 5, 5)
hideText.style.fill = 0xFFFFFF
hideText.style.fontSize = 14
UI.addChild(hideText)
document.addEventListener('keydown', e => {
    if (e.keyCode === 72) UI.visible = !UI.visible
})

let audioSrc
const audioCtx = new AudioContext()

const recordText = new PIXI.Text('Record')
recordText.position.set(5, 5)
recordText.style.fill = 0xFFFFFF
recordText.interactive = true
recordText.buttonMode = true
recordText.on('pointerdown', () => {
    if (audioSrc === undefined || audioSrc instanceof MediaElementAudioSourceNode) {
        if (navigator.mediaDevices) {
            navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
                if (activeSong) activeSong.style.fill = 0xFFFFFF
                activeSong = recordText
                recordText.style.fill = 0xAA9245
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
})
UI.addChild(recordText)

const text = new PIXI.Text('Demo Songs:')
text.position.set(5, 40)
text.style.fill = 0xFFFFFF
UI.addChild(text)

const audioEl = document.createElement('audio')
const MEASN = audioCtx.createMediaElementSource(audioEl)
document.body.appendChild(audioEl)

let activeSong

let y = 0
function createDemoSong(id, name) {
    const text = new PIXI.Text(name)
    text.position.set(10, y++ * 20 + 80)
    text.style.fontSize = 16
    text.style.fill = 0xFFFFFF
    text.interactive = true
    text.buttonMode = true
    text.on('pointerdown', () => {
        if (activeSong) activeSong.style.fill = 0xFFFFFF
        activeSong = text
        text.style.fill = 0x009245
        audioEl.src = `./demo-songs/${id}.mp3`
        //https://bugs.chromium.org/p/chromium/issues/detail?id=715049
        audioEl.play()
        if (audioSrc === undefined || audioSrc instanceof MediaStreamAudioSourceNode) {
            if (audioSrc !== undefined) audioSrc.disconnect()
            audioSrc = MEASN
            audioSrc.connect(lowFilter)
            audioSrc.connect(highFilter)
            audioSrc.connect(audioCtx.destination)
        }
    })
    UI.addChild(text)
}

createDemoSong(0, 'And So It Begins by Artificial.Music')
createDemoSong(1, 'Dreams by Joakim Karud')
createDemoSong(2, 'Vibe With Me by Joakim Karud')
createDemoSong(3, 'Rêveur by Peyruis')
createDemoSong(4, 'Focused by Kontekst')
createDemoSong(5, 'Crying Over You by Chris Morrow 4')

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

    const X = app.renderer.width / 2
    const Y = app.renderer.height / 2

    graphics.lineStyle(1.5, 0x009245)
    for (let i = 0; i < lowFrequencyData.length; i++) {
        if (lowFrequencyData[i] !== 0) {
            const R = lowFrequencyData[i] * smallerSide / 512

            drawArcV1(i, X, Y, R, 1, 5)
            drawArcV1(i, X, Y, R, 7, 11)
            drawArcV1(i, X, Y, R, 13, 17)
            drawArcV1(i, X, Y, R, 19, 23)
        }
    }

    graphics.lineStyle(1.5, 0xAA9245)
    for (let i = 0; i < highFrequencyData.length; i++) {
        if (highFrequencyData[i] !== 0) {
            const R = highFrequencyData[i] * smallerSide / 1024

            drawArcV2(i, X, Y, R, 1, 5)
            drawArcV2(i, X, Y, R, 7, 11)
            drawArcV2(i, X, Y, R, 13, 17)
            drawArcV2(i, X, Y, R, 19, 23)
        }
    }
})

function drawArcV1(i, w, h, r, a, b) {
    const v = (0.75 - r / (smallerSide / 2))
    const A = rad15deg * a + v
    const B = rad15deg * b - v
    if (B > A) {
        drawArc(w, h, r, A, B)
    }
}

function drawArcV2(i, w, h, r, a, b) {
    drawArc(w, h, r, rad15deg * (a + i), rad15deg * (b + i))
}

function drawArc(cx, cy, radius, startAngle, endAngle) {
    const startX = cx + (Math.cos(startAngle) * radius)
    const startY = cy + (Math.sin(startAngle) * radius)
    graphics.moveTo(startX, startY)
    graphics.arc(cx, cy, radius, startAngle, endAngle)
}
