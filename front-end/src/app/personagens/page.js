"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import { buildApiUrl, buildAssetUrl } from "@/lib/api";

// Dados mockados
const posesDisponiveis = [
  "Neutro", 
  "Feliz", 
  "Triste",
  "Bravo",
  "Explicando", 
  "Preocupado", 
  "Alerta", 
  "Apontando",
  "Pensativo"
];

export default function PersonagensCMS() {
  const [personagens, setPersonagens] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [viewingImage, setViewingImage] = useState(null);
  
  const fileInputRefs = useRef({});
  const localIdCounter = useRef(0);

  const [formData, setFormData] = useState({
    id: null,
    nomePersonagem: "",
    descricao: "",
    imagens: []
  });

  const isEditing = formData.id !== null;

  const makeLocalImageId = () => {
    localIdCounter.current += 1;
    return `img-${localIdCounter.current}`;
  };

  const toUiPersonagem = (personagemApi) => {
    const poses = Array.isArray(personagemApi.poses) ? personagemApi.poses : [];
    return {
      id: personagemApi._id,
      nomePersonagem: personagemApi.nomePersonagem || "",
      descricao: personagemApi.descricao || "",
      imagens: poses.map((poseItem, index) => {
        const poseNome = typeof poseItem === "string"
          ? posesDisponiveis[index] || `Pose ${index + 1}`
          : poseItem?.pose || posesDisponiveis[index] || `Pose ${index + 1}`;
        const url = typeof poseItem === "string" ? poseItem : poseItem?.url || "";

        return {
          id: `${personagemApi._id}-${index + 1}`,
          url,
          pose: poseNome,
        };
      }),
    };
  };

  const loadPersonagens = useCallback(async () => {
    try {
      const res = await fetch(buildApiUrl("personagem"));
      if (!res.ok) {
        throw new Error("Falha ao carregar personagens");
      }

      const data = await res.json();
      const personagensApi = Array.isArray(data.personagem) ? data.personagem : [];
      setPersonagens(personagensApi.map(toUiPersonagem));
    } catch (error) {
      console.error("Erro ao buscar personagens:", error);
    }
  }, []);

  useEffect(() => {
    void loadPersonagens();
  }, [loadPersonagens]);

  // Gerenciamento de Imagens/Poses
  const handleAddImagem = () => {
    setFormData({
      ...formData,
      imagens: [
        ...formData.imagens, 
        { id: makeLocalImageId(), url: "", pose: "Neutro" }
      ]
    });
  };

  const handleRemoveImagem = (idToRemove) => {
    setFormData({
      ...formData,
      imagens: formData.imagens.filter(img => img.id !== idToRemove)
    });
    if (fileInputRefs.current[idToRemove]) {
      delete fileInputRefs.current[idToRemove];
    }
  };

  const handleChangeImagemField = (id, field, value) => {
    setFormData({
      ...formData,
      imagens: formData.imagens.map(img => 
        img.id === id ? { ...img, [field]: value } : img
      )
    });
  };

  const handleFileUpload = async (e, imgId) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const data = new FormData();
    data.set('file', file);

    try {
      const res = await fetch(buildApiUrl("upload"), { method: 'POST', body: data });
      const result = await res.json();
      if (result.url) {
        handleChangeImagemField(imgId, 'url', result.url);
      }
    } catch (error) {
      console.error("Erro no upload:", error);
      setTimeout(() => {
        handleChangeImagemField(imgId, 'url', URL.createObjectURL(file));
      }, 800);
    } finally {
      setUploading(false);
    }
  };

  // Submissão do Formulário
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.imagens.some(img => !img.url)) {
      alert("Por favor, faça upload de imagem para todas as poses adicionadas.");
      return;
    }

    const payload = {
      nomePersonagem: formData.nomePersonagem,
      descricao: formData.descricao,
      poses: formData.imagens
        .filter((img) => img.url)
        .map((img) => ({ pose: img.pose, url: img.url })),
    };

    try {
      const endpoint = isEditing
        ? buildApiUrl(`personagem/${formData.id}`)
        : buildApiUrl("personagem");
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("Falha ao salvar personagem");
      }

      await loadPersonagens();
      handleCancel();
    } catch (error) {
      console.error("Erro ao salvar personagem:", error);
    }
  };

  const handleEdit = (personagem) => {
    setFormData({ ...personagem });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = () => {
    setFormData({ id: null, nomePersonagem: "", descricao: "", imagens: [] });
    fileInputRefs.current = {};
  };

  const confirmDelete = async () => {
    if (deleteConfirm) {
      try {
        const res = await fetch(buildApiUrl(`personagem/${deleteConfirm.id}`), {
          method: "DELETE",
        });

        if (!res.ok) {
          throw new Error("Falha ao excluir personagem");
        }

        await loadPersonagens();
        setDeleteConfirm(null);
      } catch (error) {
        console.error("Erro ao excluir personagem:", error);
      }
    }
  };

  return (
    <div className="flex min-h-screen bg-white font-sans text-gray-900">
      <Sidebar />

      <main className="flex-1 p-8 flex flex-col gap-8">
        <header className="border-b border-gray-200 pb-5">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Personagens</h1>
          <p className="mt-2 text-sm text-gray-500">
            {isEditing ? `Editando o personagem: ${formData.nomePersonagem}` : "Crie, edite ou remova personagens"}
          </p>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-x-8 gap-y-10 items-start">
          
          {/* FORMULÁRIO LATERAL */}
          <div className="xl:col-span-1">
            <form className="space-y-6 sticky top-8" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-medium text-gray-900">Nome do Personagem</label>
                <div className="mt-2">
                  <input 
                    type="text" 
                    required 
                    value={formData.nomePersonagem} 
                    onChange={(e) => setFormData({...formData, nomePersonagem: e.target.value})} 
                    placeholder="Ex: Alex"
                    className="block w-full rounded-md bg-white px-3 py-2 text-sm text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-red-400" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900">Descrição</label>
                <div className="mt-2">
                  <textarea 
                    rows={3} 
                    required 
                    value={formData.descricao} 
                    onChange={(e) => setFormData({...formData, descricao: e.target.value})} 
                    placeholder="Breve resumo..."
                    className="block w-full rounded-md bg-white px-3 py-2 text-sm text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-red-400 resize-none"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100">
                <div className="flex justify-between items-center mb-4">
                  <label className="block text-sm font-medium text-gray-900">Imagens e Poses</label>
                  <button 
                    type="button"
                    onClick={handleAddImagem}
                    className="text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 px-2 py-1 rounded transition-colors"
                  >
                    + Adicionar Pose
                  </button>
                </div>

                {formData.imagens.length === 0 ? (
                  <div className="text-center p-4 border border-dashed border-gray-300 rounded-md text-xs text-gray-500">
                    Nenhuma pose cadastrada.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {formData.imagens.map((img) => (
                      <div key={img.id} className="p-3 rounded-md outline outline-1 outline-gray-200 bg-gray-50 relative">
                        <div className="flex justify-between items-center mb-2">
                          <select 
                            value={img.pose}
                            onChange={(e) => handleChangeImagemField(img.id, 'pose', e.target.value)}
                            className="block w-2/3 rounded-md bg-white px-2 py-1 text-xs text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-red-400"
                          >
                            {posesDisponiveis.map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                          <button 
                            type="button" 
                            onClick={() => handleRemoveImagem(img.id)} 
                            className="text-gray-400 hover:text-red-500 transition-colors"
                            title="Remover Pose"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                          </button>
                        </div>

                        <div className="flex gap-3 items-center">
                          {img.url ? (
                            <img src={buildAssetUrl(img.url)} alt="Preview" className="w-10 h-10 rounded bg-white object-cover outline outline-1 outline-gray-200 shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded bg-gray-200 outline outline-1 outline-gray-300 flex items-center justify-center shrink-0">
                              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            </div>
                          )}
                          <input 
                            type="file" 
                            accept="image/*"
                            required={!img.url}
                            ref={el => fileInputRefs.current[img.id] = el}
                            onChange={(e) => handleFileUpload(e, img.id)}
                            className="block w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100 cursor-pointer"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <button 
                  type="submit" 
                  disabled={uploading}
                  className="flex w-full justify-center rounded-md bg-red-400 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400 transition-colors disabled:opacity-50"
                >
                  {uploading ? "Processando Imagens..." : isEditing ? "Atualizar Personagem" : "Cadastrar Personagem"}
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

          <div className="xl:col-span-3">
            <div className="overflow-x-auto bg-white outline outline-1 -outline-offset-1 outline-gray-200 rounded-lg shadow-sm">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Personagem</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Descrição</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-900 uppercase tracking-wider">Poses</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-900 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {personagens.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-8 text-center text-sm font-medium text-gray-500">
                        Nenhum personagem cadastrado.
                      </td>
                    </tr>
                  ) : (
                    personagens.map((p) => (
                      <tr key={p.id} className={formData.id === p.id ? "bg-red-50/30" : "hover:bg-gray-50/50 transition-colors"}>
                        
                        <td className="whitespace-nowrap px-6 py-4 flex items-center gap-3">
                          {p.imagens && p.imagens.length > 0 ? (
                            <img src={buildAssetUrl(p.imagens[0].url)} alt={p.nomePersonagem} className="w-10 h-10 rounded-full bg-gray-100 object-cover outline outline-1 outline-gray-200" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center outline outline-1 outline-gray-200 text-gray-400 text-xs">?</div>
                          )}
                          <div className="text-sm font-semibold text-gray-900">{p.nomePersonagem}</div>
                        </td>
                        
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-500 line-clamp-2 max-w-xs whitespace-normal">
                            {p.descricao}
                          </p>
                        </td>

                        <td className="whitespace-nowrap px-6 py-4 text-center">
                          <div className="flex -space-x-2 justify-center overflow-hidden p-1">
                            {p.imagens && p.imagens.slice(0, 3).map((img) => (
                              <img 
                                key={img.id} 
                                title={img.pose} 
                                src={buildAssetUrl(img.url)} 
                                alt={img.pose} 
                                onClick={() => setViewingImage(buildAssetUrl(img.url))}
                                className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover bg-gray-50 outline outline-1 outline-gray-200 cursor-pointer hover:opacity-80 transition-opacity" 
                              />
                            ))}
                            {p.imagens && p.imagens.length > 3 && (
                              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-gray-100 ring-2 ring-white text-xs font-medium text-gray-500 outline outline-1 outline-gray-200">
                                +{p.imagens.length - 3}
                              </div>
                            )}
                            {(!p.imagens || p.imagens.length === 0) && (
                               <span className="text-xs text-gray-400">Nenhuma</span>
                            )}
                          </div>
                        </td>

                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                          <button onClick={() => handleEdit(p)} className="text-red-500 hover:text-red-400 mr-4 transition-colors">Editar</button>
                          <button onClick={() => setDeleteConfirm(p)} className="text-gray-400 hover:text-gray-600 transition-colors">Excluir</button>
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

      {viewingImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-sm" onClick={() => setViewingImage(null)}>
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-3xl outline outline-1 outline-gray-200 overflow-hidden flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h3 className="text-sm font-bold text-gray-900">Visualização da Pose</h3>
              <button 
                onClick={() => setViewingImage(null)} 
                className="text-gray-400 hover:text-gray-600 bg-white p-1.5 rounded-md outline outline-1 outline-gray-200 shadow-sm transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-4 flex-1 flex justify-center items-center bg-gray-100 overflow-hidden inner-shadow">
              <img 
                src={viewingImage} 
                alt="Preview da Pose" 
                className="max-w-full max-h-full rounded outline outline-1 outline-gray-200 object-contain bg-white shadow-sm" 
              />
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-500/75 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden outline outline-1 outline-gray-200">
            <div className="p-6 text-center">
              <h3 className="text-lg font-bold text-gray-900">Confirmar exclusão</h3>
              <p className="mt-2 text-sm text-gray-500">
                Remover o personagem <span className="font-bold text-gray-900">{deleteConfirm.nomePersonagem}</span> e todas as suas poses?
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