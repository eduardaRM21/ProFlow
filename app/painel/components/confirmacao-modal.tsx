"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CheckCircle, Package, Truck } from "lucide-react"

interface NFBipada {
  id: string
  codigoCompleto: string
  codigo: string
  numeroNF: string
  volume: number
  codigoDestino: string
  nomeFornecedor: string
  destinoFinal: string
  tipo: string
  timestamp: string
  status: "valida" | "formato_incorreto" | "destino_divergente" | "duplicada" | "volume_invalido" | "invalida"
  erro?: string
}

interface ConfirmacaoModalProps {
  isOpen: boolean
  onClose: () => void
  nf: NFBipada | null
  carroNome: string
  onConfirm: () => void
}

export default function ConfirmacaoModal({ isOpen, onClose, nf, carroNome, onConfirm }: ConfirmacaoModalProps) {
  if (!nf) return null

  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-700">
            <CheckCircle className="h-5 w-5" />
            NF Validada com Sucesso!
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Informações da NF */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Package className="h-5 w-5 text-green-600" />
              <h3 className="font-semibold text-green-800">Detalhes da Nota Fiscal</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="font-medium text-gray-700">NF:</span>
                <span className="ml-2 text-gray-900">{nf.numeroNF}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Volume:</span>
                <span className="ml-2 text-gray-900">{nf.volume}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Fornecedor:</span>
                <span className="ml-2 text-gray-900">{nf.nomeFornecedor}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Destino:</span>
                <span className="ml-2 text-gray-900">{nf.destinoFinal}</span>
              </div>
            </div>
          </div>

          {/* Informações do Carro */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Truck className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-blue-800">Carro de Destino</h3>
            </div>
            
            <div className="text-sm">
              <span className="font-medium text-gray-700">Nome:</span>
              <span className="ml-2 text-gray-900">{carroNome}</span>
            </div>
          </div>

          {/* Mensagem de sucesso */}
          <div className="text-center text-sm text-gray-600">
            ✅ A NF foi validada e adicionada ao carro com sucesso!
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button onClick={onClose} variant="outline">
            Cancelar
          </Button>
          <Button onClick={handleConfirm} className="bg-green-600 hover:bg-green-700">
            Confirmar Bipagem
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
