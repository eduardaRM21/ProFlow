"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Barcode,
  Camera,
  Square,
  AlertTriangle,
  CheckCircle,
  Loader2,
} from "lucide-react";

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  isLoading?: boolean;
}

export function BarcodeScanner({ onScan, isLoading = false }: BarcodeScannerProps) {
  const [scanMode, setScanMode] = useState<"manual" | "camera">("manual");
  const [manualCode, setManualCode] = useState("");
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [scanHistory, setScanHistory] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Simular scanner de câmera (em produção, usar biblioteca como QuaggaJS ou ZXing)
  const startCameraScan = async () => {
    try {
      setError(null);
      setIsScanning(true);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }

      // Simular detecção de código de barras
      setTimeout(() => {
        simulateBarcodeDetection();
      }, 2000);

    } catch (err) {
      setError("Erro ao acessar câmera. Use o modo manual.");
      setScanMode("manual");
      setIsScanning(false);
    }
  };

  const stopCameraScan = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
  };

  const simulateBarcodeDetection = () => {
    // Simular códigos de barras para teste
    const testCodes = [
      "7891234567890",
      "7891234567891", 
      "7891234567892",
      "7891234567893",
      "7891234567894"
    ];
    
    const randomCode = testCodes[Math.floor(Math.random() * testCodes.length)];
    handleCodeScanned(randomCode);
  };

  const handleCodeScanned = (code: string) => {
    if (isLoading) return;

    setLastScanned(code);
    setScanHistory(prev => [code, ...prev.slice(0, 4)]); // Manter últimos 5
    setSuccess(`Código escaneado: ${code}`);
    setError(null);

    // Limpar mensagem de sucesso após 2 segundos
    setTimeout(() => {
      setSuccess(null);
    }, 2000);

    // Processar código
    onScan(code);

    // Limpar input manual
    if (scanMode === "manual") {
      setManualCode("");
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleCodeScanned(manualCode.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && manualCode.trim()) {
      handleCodeScanned(manualCode.trim());
    }
  };

  useEffect(() => {
    return () => {
      stopCameraScan();
    };
  }, []);

  return (
    <div className="space-y-4">
      {/* Modo de Scanner */}
      <div className="flex space-x-2">
        <Button
          variant={scanMode === "manual" ? "default" : "outline"}
          onClick={() => {
            setScanMode("manual");
            stopCameraScan();
          }}
          className="flex-1"
        >
          <Barcode className="h-4 w-4 mr-2" />
          Manual
        </Button>
        <Button
          variant={scanMode === "camera" ? "default" : "outline"}
          onClick={() => setScanMode("camera")}
          className="flex-1"
        >
          <Camera className="h-4 w-4 mr-2" />
          Câmera
        </Button>
      </div>

      {/* Scanner Manual */}
      {scanMode === "manual" && (
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="barcode">Código de Barras</Label>
                <Input
                  id="barcode"
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Digite ou escaneie o código"
                  disabled={isLoading}
                  className="text-center text-lg font-mono"
                  autoFocus
                />
              </div>
              <Button
                type="submit"
                disabled={!manualCode.trim() || isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Confirmar
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Scanner de Câmera */}
      {scanMode === "camera" && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {!isScanning ? (
                <div className="text-center space-y-4">
                  <div className="bg-gray-100 rounded-lg p-8">
                    <Camera className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600">Clique para iniciar a câmera</p>
                  </div>
                  <Button
                    onClick={startCameraScan}
                    disabled={isLoading}
                    className="w-full"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Iniciar Câmera
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative bg-black rounded-lg overflow-hidden">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-64 object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="border-2 border-white rounded-lg p-2">
                        <div className="w-48 h-32 border-2 border-red-500 rounded"></div>
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={stopCameraScan}
                    variant="outline"
                    className="w-full"
                  >
                    <Square className="h-4 w-4 mr-2" />
                    Parar Câmera
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mensagens de Status */}
      {error && (
        <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <span className="text-red-800 text-sm">{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <span className="text-green-800 text-sm">{success}</span>
        </div>
      )}

      {/* Histórico de Scans */}
      {scanHistory.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-medium mb-3">Últimos Códigos Escaneados</h3>
            <div className="space-y-2">
              {scanHistory.map((code, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded"
                >
                  <span className="font-mono text-sm">{code}</span>
                  <span className="text-xs text-gray-500">
                    {index === 0 ? "Agora" : `${index + 1}º`}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instruções */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="font-medium mb-2">Instruções</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• <strong>Modo Manual:</strong> Digite o código ou use um scanner USB</li>
            <li>• <strong>Modo Câmera:</strong> Aponte a câmera para o código de barras</li>
            <li>• Produtos duplicados incrementam a quantidade automaticamente</li>
            <li>• Pressione Enter para confirmar no modo manual</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
