"use client";

import dynamic from "next/dynamic";
import { useState, useRef, useEffect, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import { buildApiUrl, buildAssetUrl } from "@/lib/api";

import "leaflet/dist/leaflet.css";

const ModelagemMap = dynamic(() => import("@/components/ModelagemMap"), { ssr: false });
const Model3DViewer = dynamic(() => import("@/components/Model3DViewer"), { ssr: false });

export default function ModelagensCMS() {
  const [isMounted, setIsMounted] = useState(false);
  const [modelagens, setModelagens] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [viewing3D, setViewing3D] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  
  
  const model3DInputRef = useRef(null);

  const [formData, setFormData] = useState({
    id: null, 
    nomeModelagem: "", 
    latitude: "",
    longitude: "",
    descricaoModelagem: "", 
    modeloURL: "",
    tipoModelo: "gltf"
  });

  const isEditing = formData.id !== null;

  const loadModelagens = useCallback(async () => {
    try {
      const res = await fetch(buildApiUrl("modelagem"));
      if (!res.ok) {
        throw new Error("Falha ao carregar modelagens");
      }

      const data = await res.json();
      const modelagensApi = Array.isArray(data.modelagens) ? data.modelagens : [];
      const mapped = modelagensApi.map((m) => ({
        ...m,
        id: m._id,
        isMocked: false,
      }));
      setModelagens(mapped);
    } catch (error) {
      console.error("Erro ao buscar modelagens:", error);
      // Em caso de erro, limpar a lista
      setModelagens([]);
    }
  }, []);

  useEffect(() => {
    setIsMounted(true);
    void loadModelagens();
  }, [loadModelagens]);

  const handleFileUpload = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadError("");

    const extension = file.name.toLowerCase().split('.').pop();
    if (extension === "gltf") {
      setUploadError("Arquivo .gltf aparece para selecao, mas para funcionar envie .zip com .gltf + scene.bin + textures, ou use .glb.");
      return;
    }

    setUploading(true);
    const data = new FormData();
    data.set('file', file);

    try {
      // Detectar tipo de arquivo e usar a rota apropriada
      const isZipModel = extension === "zip";
      const is3DModel = extension === "glb";
      const endpoint = isZipModel
        ? buildApiUrl("upload/3d-zip")
        : is3DModel
          ? buildApiUrl("upload/3d")
          : buildApiUrl("upload");

      const res = await fetch(endpoint, { method: 'POST', body: data });
      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        throw new Error(errorBody.error || "Falha no upload do modelo 3D.");
      }

      const result = await res.json();
      if (result.url) {
        setFormData(prev => ({ ...prev, [field]: result.url }));
      } else {
        throw new Error("Resposta de upload sem URL do modelo.");
      }
    } catch (error) {
      console.error("Erro no upload:", error);
      setUploadError(error.message || "Erro no upload do modelo 3D.");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      nomeModelagem: formData.nomeModelagem,
      latitude: formData.latitude,
      longitude: formData.longitude,
      descricaoModelagem: formData.descricaoModelagem,
      modeloURL: formData.modeloURL,
      tipoModelo: formData.tipoModelo,
    };

    try {
      const endpoint = isEditing
        ? buildApiUrl(`modelagem/${formData.id}`)
        : buildApiUrl("modelagem");

      const method = isEditing ? "PUT" : "POST";
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("Falha ao salvar modelagem");
      }

      await loadModelagens();
      handleCancel();
    } catch (error) {
      console.error("Erro ao salvar modelagem:", error);
    }
  };

  const handleEdit = (modelagem) => setFormData({ ...modelagem });

  const handleCancel = () => {
    setFormData({ id: null, nomeModelagem: "", latitude: "", longitude: "", descricaoModelagem: "", modeloURL: "", tipoModelo: "gltf" });
    if(model3DInputRef.current) model3DInputRef.current.value = "";
  };

  const confirmDelete = async () => {
    if (deleteConfirm) {
      try {
        const res = await fetch(buildApiUrl(`modelagem/${deleteConfirm.id}`), {
          method: "DELETE",
        });

        if (!res.ok) {
          throw new Error("Falha ao excluir modelagem");
        }

        await loadModelagens();
        setDeleteConfirm(null);
      } catch (error) {
        console.error("Erro ao excluir modelagem:", error);
      }
    }
  };

  const mapCenter = [
    formData.latitude || -24.490,
    formData.longitude || -47.844
];

  return (
    <div className="flex min-h-screen bg-white font-sans text-gray-900">
      <Sidebar />

      <main className="flex-1 p-8 flex flex-col gap-8">
        <header className="border-b border-gray-200 pb-5 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Modelagens</h1>
            <p className="mt-2 text-sm text-gray-500">
              {isEditing ? `Editando a modelagem: ${formData.nomeModelagem}` : "Crie, edite ou remova modelagens 3D"}
            </p>
          </div>
          {/* controles removidos - apenas modelagens reais são exibidas */}
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-x-8 gap-y-10">
          
          {/* FORMULÁRIO LATERAL */}
          <div className="xl:col-span-1">
            <form className="space-y-6 sticky top-8" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-medium text-gray-900">Nome da Modelagem</label>
                <div className="mt-2">
                  <input 
                    type="text" 
                    required 
                    value={formData.nomeModelagem} 
                    onChange={(e) => setFormData({...formData, nomeModelagem: e.target.value})} 
                    placeholder="Ex: Servidor Rack 42U"
                    className="block w-full rounded-md bg-white px-3 py-2 text-sm text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-red-400" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900">Latitude</label>
                  <div className="mt-2">
                    <input 
                      type="number" 
                      step="any" 
                      required
                      placeholder="-23.5505" 
                      value={formData.latitude} 
                      onChange={(e) => setFormData({...formData, latitude: parseFloat(e.target.value) || ""})} 
                      className="block w-full rounded-md bg-white px-3 py-2 text-sm text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-red-400" 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900">Longitude</label>
                  <div className="mt-2">
                    <input 
                      type="number" 
                      step="any" 
                      required
                      placeholder="-46.6333" 
                      value={formData.longitude} 
                      onChange={(e) => setFormData({...formData, longitude: parseFloat(e.target.value) || ""})} 
                      className="block w-full rounded-md bg-white px-3 py-2 text-sm text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-red-400" 
                    />
                  </div>
                </div>
              </div>

              {/* SEÇÃO DO MAPA */}
              <div className="mt-2">
                <label className="block text-sm font-medium text-gray-900 mb-2">Clique no mapa para posicionar o modelo 3D</label>
                {isMounted ? (
                  <div className="h-56 w-full rounded-md overflow-hidden outline outline-1 outline-gray-300 relative z-0">
                    <ModelagemMap
                      center={mapCenter}
                      latitude={formData.latitude}
                      longitude={formData.longitude}
                      setFormData={setFormData}
                    />
                  </div>
                ) : (
                  <div className="h-56 w-full rounded-md bg-gray-100 animate-pulse outline outline-1 outline-gray-300 flex items-center justify-center">
                    <span className="text-sm text-gray-400">Carregando mapa...</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900">Descrição</label>
                <div className="mt-2">
                  <textarea 
                    rows={3}
                    required 
                    value={formData.descricaoModelagem} 
                    onChange={(e) => setFormData({...formData, descricaoModelagem: e.target.value})} 
                    placeholder="Detalhes sobre este asset..."
                    className="block w-full rounded-md bg-white px-3 py-2 text-sm text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-red-400 resize-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900">Modelo 3D (GLB ou ZIP com GLTF)</label>
                <div className="mt-2">
                  <input 
                    type="file" 
                    ref={model3DInputRef} 
                    accept=".gltf,.glb,.zip"
                    onChange={(e) => handleFileUpload(e, 'modeloURL')}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 outline outline-1 -outline-offset-1 outline-gray-300 rounded-md bg-white cursor-pointer"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Use .glb para arquivo unico ou .zip contendo .gltf + scene.bin + textures.
                  </p>
                  {uploadError && (
                    <p className="mt-1 text-xs text-red-600">{uploadError}</p>
                  )}
                  {formData.modeloURL && (
                    <p className="mt-1 text-xs text-green-600">✓ Modelo 3D carregado</p>
                  )}
                </div>
              </div>

              {/* Imagem/preview removido — somente cadastro de modelo 3D */}

              <div className="flex flex-col gap-3">
                <button 
                  type="submit" 
                  disabled={uploading}
                  className="flex w-full justify-center rounded-md bg-red-400 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400 transition-colors disabled:opacity-50"
                >
                  {uploading ? "Processando Modelo 3D..." : isEditing ? "Atualizar Modelagem" : "Cadastrar Modelagem"}
                </button>
                
                {isEditing && (
                  <button 
                    type="button" 
                    onClick={handleCancel} 
                    className="text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Cancelar edição
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* TABELA DE LISTAGEM */}
          <div className="xl:col-span-3">
            <div className="overflow-hidden bg-white outline outline-1 -outline-offset-1 outline-gray-200 rounded-lg shadow-sm">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Modelagem & Local</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Descrição</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-900 uppercase tracking-wider">Preview</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-900 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {modelagens.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-8 text-center text-sm font-medium text-gray-500">
                        Nenhuma modelagem cadastrada.
                      </td>
                    </tr>
                  ) : (
                    modelagens.map((modelagem) => (
                      <tr key={modelagem.id} className={formData.id === modelagem.id ? "bg-red-50/30" : "hover:bg-gray-50/50 transition-colors"}>
                        
                        {/* COLUNA: NOME E LOCALIZAÇÃO */}
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="text-sm font-semibold text-gray-900">{modelagem.nomeModelagem}</div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            Lat: {modelagem.latitude} | Lng: {modelagem.longitude}
                          </div>
                          {modelagem.isMocked && (
                            <div className="text-xs text-blue-600 mt-1 font-medium">
                              📌 Exemplo (Mockado)
                            </div>
                          )}
                        </td>

                        {/* COLUNA: DESCRIÇÃO */}
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-500 line-clamp-2 max-w-xs whitespace-normal">
                            {modelagem.descricaoModelagem}
                          </p>
                        </td>

                        {/* COLUNA: PREVIEW */}
                        <td className="whitespace-nowrap px-6 py-4 text-center">
                          <div className="flex justify-center gap-2">
                            {modelagem.modeloURL ? (
                              <button 
                                onClick={() => setViewing3D(modelagem)}
                                className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-600 ring-1 ring-inset ring-blue-500/10 hover:bg-blue-100 transition-colors"
                              >
                                Ver 3D
                              </button>
                            ) : (
                              <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-400 ring-1 ring-inset ring-gray-500/10 opacity-60">
                                Sem 3D
                              </span>
                            )}
                            
                            {/* Imagem removida — apenas 3D */}
                          </div>
                        </td>

                        {/* COLUNA: AÇÕES */}
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                          {!modelagem.isMocked && (
                            <>
                              <button onClick={() => handleEdit(modelagem)} className="text-red-500 hover:text-red-400 mr-4 transition-colors">Editar</button>
                              <button onClick={() => setDeleteConfirm(modelagem)} className="text-gray-400 hover:text-gray-600 transition-colors">Excluir</button>
                            </>
                          )}
                          {modelagem.isMocked && (
                            <span className="text-xs text-gray-400">Apenas visualização</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </main>

      {/* MODAL DE PREVIEW 3D */}
      {viewing3D && isMounted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-sm" onClick={() => setViewing3D(null)}>
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl outline outline-1 outline-gray-200 overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Visualização 3D</h3>
                <p className="text-xs text-gray-500 mt-0.5">{viewing3D.nomeModelagem}</p>
              </div>
              <button 
                onClick={() => setViewing3D(null)} 
                className="text-gray-400 hover:text-gray-600 bg-white p-1.5 rounded-md outline outline-1 outline-gray-200 shadow-sm transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-4 flex-1 bg-gray-100 overflow-hidden">
              <Model3DViewer modelUrl={viewing3D.modeloURL} modelName={viewing3D.nomeModelagem} />
            </div>
          </div>
        </div>
      )}

      {/* Modal de imagem removido — somente preview 3D permanece */}

      {/* MODAL DE EXCLUSÃO */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-500/75 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden outline outline-1 outline-gray-200">
            <div className="p-6 text-center">
              <h3 className="text-lg font-bold text-gray-900">Confirmar exclusão</h3>
              <p className="mt-2 text-sm text-gray-500">
                Remover a modelagem <span className="font-bold text-gray-900">{deleteConfirm.nomeModelagem}</span>?
              </p>
            </div>
            <div className="flex bg-gray-50 p-4 gap-3">
              <button 
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm outline outline-1 -outline-offset-1 outline-gray-300 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 rounded-md bg-red-400 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-300 transition-colors"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}