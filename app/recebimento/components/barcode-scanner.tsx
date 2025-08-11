"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { QrCode, AlertTriangle, CheckCircle } from 'lucide-react'

interface BarcodeScannerProps {
  onScan: (code: string) => void
  onError: (error: string) => void
}

export default function BarcodeScanner({ onScan, onError }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<any | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastScan, setLastScan] = useState<string | null>(null)

  useEffect(() => {
    startScanner()
    return () => stopScanner()
  }, [])

  // Reativar scanner automaticamente após leitura
  useEffect(() => {
    if (lastScan && !isScanning) {
      // Aguardar um pouco antes de reativar para dar tempo da confirmação
      const timer = setTimeout(() => {
        setLastScan(null) // Limpar o último scan
        startScanner() // Reativar o scanner
      }, 1500) // 1.5 segundos de delay

      return () => clearTimeout(timer)
    }
  }, [lastScan, isScanning])

  const startScanner = async () => {
    setError(null)
    setIsScanning(true)

    try {
      const ZXing = await import("@zxing/library")
      const { BrowserQRCodeReader, NotFoundException, DecodeHintType, BarcodeFormat } = ZXing

      const hints = new Map()
      hints.set(DecodeHintType.TRY_HARDER, true)
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE])

      const reader = new BrowserQRCodeReader(hints as any)
      const video = videoRef.current!

      // Tenta câmera traseira primeiro
      const constraintsBack: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      }

      try {
        controlsRef.current = await (reader as any).decodeFromConstraints(constraintsBack, video, (result: any, err: any, controls: any) => {
          if (result) {
            const text = result.getText()
            if (text && text !== lastScan) {
              setLastScan(text)
              onScan(text)
              controls.stop()
              setIsScanning(false)
            }
          }
          if (err && !(err instanceof NotFoundException)) {
            // Erros diferentes de "não encontrado" (normal quando não há QR no quadro)
            // console.debug(err)
          }
        })
      } catch (e) {
        // Fallback: tenta câmera frontal
        const constraintsFront: MediaStreamConstraints = {
          video: {
            facingMode: { ideal: "user" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        }
        controlsRef.current = await (reader as any).decodeFromConstraints(constraintsFront, video, (result: any, err: any, controls: any) => {
          if (result) {
            const text = result.getText()
            if (text && text !== lastScan) {
              setLastScan(text)
              onScan(text)
              controls.stop()
              setIsScanning(false)
            }
          }
          if (err && !(err instanceof NotFoundException)) {
            // console.debug(err)
          }
        })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido ao iniciar o leitor"
      setError(`Erro ao iniciar o leitor de QR Code: ${msg}`)
      onError(msg)
      setIsScanning(false)
    }
  }

  const stopScanner = () => {
    try {
      if (controlsRef.current) {
        controlsRef.current.stop()
        controlsRef.current = null
      }
      const video = videoRef.current as any
      const stream: MediaStream | null = video?.srcObject || null
      if (stream) {
        stream.getTracks().forEach((t) => t.stop())
        video.srcObject = null
      }
    } catch {
      // ignora
    } finally {
      setIsScanning(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardContent className="p-6">
        {error ? (
          <Alert className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            {isScanning && (
              <Alert className="bg-blue-50 border-blue-200">
                <QrCode className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  Posicione o QR Code dentro da área quadrada
                </AlertDescription>
              </Alert>
            )}

            {lastScan && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  QR Code lido: <span className="font-mono text-sm break-all">{lastScan}</span>
                </AlertDescription>
              </Alert>
            )}

            <div className="relative">
              <video
                ref={videoRef}
                className="w-full h-64 bg-black rounded-lg object-cover"
                playsInline
                muted
                autoPlay
              />

              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="border-2 border-blue-500 border-dashed rounded-lg w-64 h-64 flex items-center justify-center bg-blue-500/10">
                  <span className="text-blue-700 text-sm font-medium bg-white/90 px-2 py-1 rounded">
                    Posicione o QR Code aqui
                  </span>
                </div>
              </div>

              {isScanning && (
                <div className="absolute top-2 right-2 bg-blue-500 text-white px-2 py-1 rounded-full text-xs flex items-center space-x-1">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  <span>Escaneando QR Code...</span>
                </div>
              )}
            </div>

            <div className="text-sm text-gray-600 space-y-2">
              <p>
                <strong>Dicas para melhor leitura:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Preencha a área quadrada com o QR Code (aproxime a câmera)</li>
                <li>Boa iluminação e sem reflexos</li>
                <li>Mantenha a mão firme por 1-2 segundos</li>
                <li>O scanner será reativado automaticamente após cada leitura</li>
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
