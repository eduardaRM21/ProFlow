"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  FileText,
  MapPin,
  Package,
  Calendar,
  User,
  Clock,
  Download,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";

interface ItemInventario {
  id: string;
  codigoCompleto: string;
  data: string;
  numeroNF: string;
  volumes: number;
  destino: string;
  fornecedor: string;
  clienteDestino: string;
  tipoCarga: string;
  quantidade: number;
  rua: string;
  timestamp: string;
}

interface RelatorioInventario {
  id: string;
  rua: string;
  data: string;
  turno: string;
  colaborador: string;
  itens: ItemInventario[];
  totalItens: number;
  tempoInicio: string;
  tempoFim: string;
}

interface RelatorioModalProps {
  rua: string;
  itens: ItemInventario[];
  session: any;
  onClose: () => void;
  onSave: (relatorio: RelatorioInventario) => void;
}

export function RelatorioModal({
  rua,
  itens,
  session,
  onClose,
  onSave,
}: RelatorioModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [observacoes, setObservacoes] = useState("");

  const totalItens = itens.reduce((total, item) => total + (item.volumes * item.quantidade), 0);
  const tempoInicio = session?.loginTime || new Date().toISOString();
  const tempoFim = new Date().toISOString();

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    
    try {
      const relatorio: RelatorioInventario = {
        id: `inventario_${Date.now()}`,
        rua: rua,
        data: session?.data || new Date().toLocaleDateString(),
        turno: session?.turno || "N/A",
        colaborador: session?.colaboradores?.join(", ") || "N/A",
        itens: itens,
        totalItens: totalItens,
        tempoInicio: tempoInicio,
        tempoFim: tempoFim,
      };

      await onSave(relatorio);
    } catch (error) {
      console.error("Erro ao gerar relatório:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPDF = () => {
    // Simular download de PDF
    const content = `
      RELATÓRIO DE INVENTÁRIO
      
      Rua: ${rua}
      Data: ${session?.data}
      Turno: ${session?.turno}
      Colaborador: ${session?.colaboradores?.join(", ")}
      
      Total de Itens: ${totalItens}
      Produtos Únicos: ${itens.length}
      
      ITENS INVENTARIADOS:
      ${itens.map(item => 
        `NF: ${item.numeroNF} - ${item.fornecedor} → ${item.clienteDestino} - Quantidade: ${item.quantidade}`
      ).join('\n')}
      
      Observações: ${observacoes}
      
      Gerado em: ${new Date().toLocaleString()}
    `;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventario_${rua.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const calcularTempoTotal = () => {
    const inicio = new Date(tempoInicio);
    const fim = new Date(tempoFim);
    const diff = fim.getTime() - inicio.getTime();
    const horas = Math.floor(diff / (1000 * 60 * 60));
    const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${horas}h ${minutos}min`;
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-purple-600" />
            <span>Finalizar Inventário</span>
          </DialogTitle>
          <DialogDescription>
            Revise os dados do inventário antes de finalizar
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações Gerais */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MapPin className="h-5 w-5 text-blue-600" />
                <span>Informações do Inventário</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-gray-600">Rua</p>
                <p className="font-medium">{rua}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-600">Data</p>
                <p className="font-medium">{session?.data}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-600">Turno</p>
                <p className="font-medium">{session?.turno}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-600">Colaborador</p>
                <p className="font-medium">{session?.colaboradores?.join(", ")}</p>
              </div>
            </CardContent>
          </Card>

          {/* Estatísticas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Package className="h-5 w-5 text-green-600" />
                <span>Estatísticas do Inventário</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{itens.length}</p>
                <p className="text-sm text-gray-600">Notas Fiscais</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{totalItens}</p>
                <p className="text-sm text-gray-600">Total de Volumes</p>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Itens */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Package className="h-5 w-5 text-orange-600" />
                <span>Notas Fiscais Inventariadas ({itens.length})</span>
              </CardTitle>
              <CardDescription>
                Notas fiscais escaneadas na rua {rua}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {itens.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Nenhuma nota fiscal foi escaneada</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {itens.map((item, index) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {index + 1}. NF: {item.numeroNF}
                        </p>
                        <p className="text-sm text-gray-600">
                          {item.fornecedor} → {item.clienteDestino}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(item.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                          Qtd: {item.quantidade}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Observações */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-gray-600" />
                <span>Observações (Opcional)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Adicione observações sobre o inventário..."
                className="w-full p-3 border border-gray-300 rounded-lg resize-none"
                rows={3}
              />
            </CardContent>
          </Card>

          {/* Ações */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleGenerateReport}
              disabled={isGenerating || itens.length === 0}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Gerando...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Finalizar Inventário
                </>
              )}
            </Button>

            <Button
              onClick={handleDownloadPDF}
              variant="outline"
              className="flex-1"
            >
              <Download className="h-4 w-4 mr-2" />
              Baixar PDF
            </Button>

            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1"
            >
              Cancelar
            </Button>
          </div>

          {/* Aviso */}
          {itens.length === 0 && (
            <div className="flex items-center space-x-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <span className="text-yellow-800 text-sm">
                Não há notas fiscais no inventário. Escaneie notas fiscais antes de gerar o relatório.
              </span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
