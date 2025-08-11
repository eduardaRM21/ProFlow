"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, CheckCircle } from "lucide-react"
import type { NotaFiscal } from "@/lib/database-service"

interface TipoDivergencia {
  codigo: string
  descricao: string
}

interface DivergenciaModalProps {
  isOpen: boolean
  nota: NotaFiscal
  tiposDivergencia: TipoDivergencia[]
  onConfirmar: (tipoDivergencia: string, volumesInformados: number) => void
  onClose: () => void
}

export default function DivergenciaModal({
  isOpen,
  nota,
  tiposDivergencia,
  onConfirmar,
  onClose,
}: DivergenciaModalProps) {
  const [volumesInformados, setVolumesInformados] = useState(nota.volumes.toString())
  const [tipoDivergencia, setTipoDivergencia] = useState("")
  const [modalConfirmacao, setModalConfirmacao] = useState(false)

  const handleSubmit = () => {
    const volumes = Number.parseInt(volumesInformados)

    if (isNaN(volumes) || volumes < 0) {
      alert("Por favor, informe uma quantidade válida de volumes.")
      return
    }

    if (!tipoDivergencia) {
      alert("Por favor, selecione o tipo de divergência.")
      return
    }

    setModalConfirmacao(true)
  }

  const confirmarDivergencia = () => {
    const volumes = Number.parseInt(volumesInformados)
    onConfirmar(tipoDivergencia, volumes)
    setModalConfirmacao(false)
    resetForm()
  }

  const resetForm = () => {
    setVolumesInformados(nota.volumes.toString())
    setTipoDivergencia("")
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const tipoSelecionado = tiposDivergencia.find((t) => t.codigo === tipoDivergencia)

  return (
    <>
      {/* Modal Principal de Divergência */}
      <Dialog open={isOpen && !modalConfirmacao} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <span>Informar Divergência</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Informações da Nota */}
            <div className="bg-orange-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-3">Nota Fiscal: {nota.numeroNF}</h3>

              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-gray-600">Volumes Originais</div>
                  <Badge variant="outline" className="bg-white">
                    {nota.volumes}
                  </Badge>
                </div>
                <div>
                  <div className="text-gray-600">Fornecedor</div>
                  <div className="font-medium">{nota.fornecedor}</div>
                </div>
                <div>
                  <div className="text-gray-600">Destino</div>
                  <div className="font-medium">{nota.destino}</div>
                </div>
              </div>
            </div>

            {/* Formulário de Divergência */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="volumes">Quantidade de Volumes Recebidos *</Label>
                <Input
                  id="volumes"
                  type="number"
                  min="0"
                  value={volumesInformados}
                  onChange={(e) => setVolumesInformados(e.target.value)}
                  className="text-lg font-semibold"
                  placeholder="Informe a quantidade real recebida"
                />
                <p className="text-xs text-gray-500 mt-1">Original: {nota.volumes} volumes</p>
              </div>

              <div>
                <Label htmlFor="tipoDivergencia">Tipo de Divergência *</Label>
                <Select value={tipoDivergencia} onValueChange={setTipoDivergencia}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo de divergência" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {tiposDivergencia.map((tipo) => (
                      <SelectItem key={tipo.codigo} value={tipo.codigo}>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{tipo.codigo}</span>
                          <span>{tipo.descricao}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Resumo da Divergência */}
            {tipoDivergencia && (
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <h4 className="font-semibold text-gray-900 mb-2">Resumo da Divergência</h4>
                <div className="space-y-1 text-sm">
                  <div>
                    <strong>Tipo:</strong> {tipoDivergencia} - {tipoSelecionado?.descricao}
                  </div>
                  <div>
                    <strong>Volumes:</strong> {nota.volumes} → {volumesInformados}
                    {Number.parseInt(volumesInformados) !== nota.volumes && (
                      <span className="text-orange-600 ml-2">
                        (Diferença: {Number.parseInt(volumesInformados) - nota.volumes})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Botões */}
            <div className="flex space-x-4">
              <Button
                onClick={handleSubmit}
                disabled={!tipoDivergencia || !volumesInformados}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
                size="lg"
              >
                <AlertTriangle className="h-5 w-5 mr-2" />
                Confirmar Divergência
              </Button>
              <Button onClick={handleClose} variant="outline" className="flex-1 bg-transparent" size="lg">
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação Final */}
      <Dialog open={modalConfirmacao} onOpenChange={() => setModalConfirmacao(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span>Confirmar Divergência</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="text-center">
              <p className="text-lg">
                Confirma que a nota <strong>{nota.numeroNF}</strong> possui{" "}
                <strong className="text-orange-600">{tipoSelecionado?.descricao}</strong>?
              </p>

              {Number.parseInt(volumesInformados) !== nota.volumes && (
                <p className="text-sm text-gray-600 mt-2">
                  Volumes alterados: {nota.volumes} → {volumesInformados}
                </p>
              )}
            </div>

            <div className="flex space-x-4">
              <Button onClick={confirmarDivergencia} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
                Confirmar
              </Button>
              <Button onClick={() => setModalConfirmacao(false)} variant="outline" className="flex-1">
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
