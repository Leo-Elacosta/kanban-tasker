"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { 
  Loader2, LogOut, Plus, X, AlertCircle, CheckCircle, 
  Edit2, Trash2, PlusCircle, CheckSquare, ChevronDown, ChevronUp, Layout
} from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

type Priority = "low" | "medium" | "high";

interface Task {
  id: string;
  title: string;
  description: string;
  position: number;
  column_id: string;
  priority: Priority;
}

interface Column {
  id: string;
  title: string;
  position: number;
  tasks: Task[];
}

interface Board {
  id: string;
  title: string;
}

export default function BoardPage() {
  const router = useRouter();
  
  // App states
  const [loadingApp, setLoadingApp] = useState(true);
  const [loadingBoard, setLoadingBoard] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Board states
  const [boards, setBoards] = useState<Board[]>([]);
  const [currentBoard, setCurrentBoard] = useState<Board | null>(null);
  const [isAddingBoard, setIsAddingBoard] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState("");
  const [boardToDelete, setBoardToDelete] = useState<Board | null>(null);

  // Column states
  const [columns, setColumns] = useState<Column[]>([]);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColTitle, setNewColTitle] = useState("");
  const [editingColumn, setEditingColumn] = useState<Column | null>(null);
  const [colToDelete, setColToDelete] = useState<Column | null>(null);

  // Task states
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskPriority, setTaskPriority] = useState<Priority>("low");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedTaskIds, setExpandedTaskIds] = useState<string[]>([]);
  const [taskToDelete, setTaskToDelete] = useState<{ id: string; columnId: string } | null>(null);

  // Helper to display toasts
  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Initial fetch for user and boards
  useEffect(() => {
    const fetchUserAndBoards = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { router.push("/login"); return; }
        
        const { data: userBoards, error } = await supabase
          .from("boards").select("*").eq("user_id", session.user.id).order("created_at", { ascending: true });

        if (error) throw error;

        if (!userBoards || userBoards.length === 0) {
          const { data: newBoard, error: bError } = await supabase
            .from("boards").insert([{ user_id: session.user.id, title: "Meu Projeto" }]).select().single();
          if (bError) throw bError;

          const defaultCols = [
            { board_id: newBoard.id, title: "A Fazer", position: 1 },
            { board_id: newBoard.id, title: "Em Andamento", position: 2 },
            { board_id: newBoard.id, title: "Concluído", position: 3 },
          ];
          await supabase.from("columns").insert(defaultCols);
          setBoards([newBoard]);
          setCurrentBoard(newBoard);
        } else {
          setBoards(userBoards);
          setCurrentBoard(userBoards[0]);
        }
      } catch (err) { showToast("Erro ao carregar dados", "error"); }
      finally { setLoadingApp(false); }
    };
    fetchUserAndBoards();
  }, [router]);

  // Fetch columns and tasks when board changes
  useEffect(() => {
    if (!currentBoard) return;
    const fetchBoardDetails = async () => {
      setLoadingBoard(true);
      try {
        const { data: cols, error: cErr } = await supabase
          .from("columns").select("*").eq("board_id", currentBoard.id).order("position", { ascending: true });
        if (cErr) throw cErr;

        if (cols && cols.length > 0) {
            const { data: tks, error: tErr } = await supabase
              .from("tasks").select("*").in("column_id", cols.map(c => c.id)).order("position", { ascending: true });
            if (tErr) throw tErr;

            setColumns(cols.map(c => ({
              ...c,
              tasks: tks ? tks.filter(t => t.column_id === c.id) : []
            })));
        } else {
            setColumns([]);
        }
      } catch (err) { showToast("Erro ao carregar colunas", "error"); }
      finally { setLoadingBoard(false); }
    };
    fetchBoardDetails();
  }, [currentBoard]);

  // --- Board Actions ---
  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newBoardTitle.trim() === "") return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase
        .from("boards")
        .insert([{ user_id: session?.user.id, title: newBoardTitle }])
        .select().single();
      if (error) throw error;
      setBoards([...boards, data]);
      setNewBoardTitle("");
      setIsAddingBoard(false);
      showToast("Quadro criado!");
    } catch (err) { showToast("Erro ao criar quadro", "error"); }
  };

  const handleDeleteBoard = async () => {
    if (!boardToDelete) return;
    try {
      const { error } = await supabase.from("boards").delete().eq("id", boardToDelete.id);
      if (error) throw error;
      const updatedBoards = boards.filter(b => b.id !== boardToDelete.id);
      setBoards(updatedBoards);
      if (currentBoard?.id === boardToDelete.id) {
        setCurrentBoard(updatedBoards.length > 0 ? updatedBoards[0] : null);
      }
      setBoardToDelete(null);
      showToast("Quadro excluído");
    } catch (err) { showToast("Erro ao excluir quadro", "error"); }
  };

  // --- Column Actions ---
  const handleCreateColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newColTitle.trim() === "" || !currentBoard) return;
    if (columns.length >= 10) { showToast("Limite de 10 colunas atingido", "error"); return; }

    try {
      const { data, error } = await supabase.from("columns").insert([{
        board_id: currentBoard.id,
        title: newColTitle,
        position: columns.length + 1
      }]).select().single();
      if (error) throw error;
      setColumns([...columns, { ...data, tasks: [] }]);
      setNewColTitle("");
      setIsAddingColumn(false);
      showToast("Coluna criada!");
    } catch (err) { showToast("Erro ao criar coluna", "error"); }
  };

  const handleUpdateColumnTitle = async (id: string, newTitle: string) => {
    try {
      const { error } = await supabase.from("columns").update({ title: newTitle }).eq("id", id);
      if (error) throw error;
      setColumns(columns.map(c => c.id === id ? { ...c, title: newTitle } : c));
      setEditingColumn(null);
    } catch (err) { showToast("Erro ao renomear", "error"); }
  };

  const handleDeleteColumn = async () => {
    if (!colToDelete) return;
    try {
      const { error } = await supabase.from("columns").delete().eq("id", colToDelete.id);
      if (error) throw error;
      setColumns(columns.filter(c => c.id !== colToDelete.id));
      setColToDelete(null);
      showToast("Coluna excluída");
    } catch (err) { showToast("Erro ao excluir coluna", "error"); }
  };

  // --- Task Actions ---
  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeColumnId || taskTitle.trim() === "") return;
    setIsSubmitting(true);
    try {
      if (editingTask) {
        const { data, error } = await supabase.from("tasks").update({ title: taskTitle, description: taskDescription, priority: taskPriority }).eq("id", editingTask.id).select().single();
        if (error) throw error;
        setColumns(columns.map(c => ({ ...c, tasks: c.tasks.map(t => t.id === editingTask.id ? data : t) })));
      } else {
        const column = columns.find(c => c.id === activeColumnId);
        const { data, error } = await supabase.from("tasks").insert([{ column_id: activeColumnId, title: taskTitle, description: taskDescription, position: column?.tasks.length || 0, priority: taskPriority }]).select().single();
        if (error) throw error;
        setColumns(columns.map(c => c.id === activeColumnId ? { ...c, tasks: [data, ...c.tasks] } : c));
      }
      setIsTaskModalOpen(false);
    } catch (err) { showToast("Erro ao salvar tarefa", "error"); }
    finally { setIsSubmitting(false); }
  };

  const handleDeleteTask = async () => {
    if (!taskToDelete) return;
    try {
      const { error } = await supabase.from("tasks").delete().eq("id", taskToDelete.id);
      if (error) throw error;
      setColumns(columns.map(c => 
        c.id === taskToDelete.columnId 
          ? { ...c, tasks: c.tasks.filter(t => t.id !== taskToDelete.id) } 
          : c
      ));
      setTaskToDelete(null);
      showToast("Tarefa excluída");
    } catch (err) { showToast("Erro ao excluir tarefa", "error"); }
  };

  const toggleTaskExpansion = (taskId: string) => {
    setExpandedTaskIds(prev => 
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  const onDragEnd = async (result: DropResult) => {
    const { source, destination } = result;
    if (!destination) return;
    const sourceColIndex = columns.findIndex(c => c.id === source.droppableId);
    const destColIndex = columns.findIndex(c => c.id === destination.droppableId);
    const newCols = [...columns];
    const [movedTask] = newCols[sourceColIndex].tasks.splice(source.index, 1);
    movedTask.column_id = destination.droppableId;
    newCols[destColIndex].tasks.splice(destination.index, 0, movedTask);
    setColumns(newCols);
    await supabase.from("tasks").update({ column_id: destination.droppableId }).eq("id", movedTask.id);
  };

  // --- Styles Generators ---
  
  // Defines styles based on task priority for the card glow and label
  // Modificado: Aumentada a intensidade das sombras e alterado amarelo para âmbar (laranja) para melhor distinção.
  const getPriorityStyles = (p: Priority) => {
    switch (p) {
      case "high":
        return {
          label: "bg-red-50 text-red-700 border-red-200",
          // Intense Red glow and border
          cardGlow: "border-red-300 shadow-[0_0_20px_rgba(239,68,68,0.4)] hover:border-red-500 hover:shadow-[0_0_25px_rgba(239,68,68,0.5)]",
          labelBr: "Urgente"
        };
      case "medium":
        return {
          // Usando Âmbar (Laranja) para diferenciar claramente do Vermelho
          label: "bg-amber-50 text-amber-800 border-amber-200",
          // Intense Amber glow and border
          cardGlow: "border-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.5)] hover:border-amber-500 hover:shadow-[0_0_25px_rgba(245,158,11,0.6)]",
          labelBr: "Importante"
        };
      case "low":
      default:
        return {
          label: "bg-green-50 text-green-700 border-green-200",
          // Subtle green highlight
          cardGlow: "border-green-200 shadow-[0_2px_8px_rgba(34,197,94,0.15)] hover:border-green-400 hover:shadow-[0_4px_12px_rgba(34,197,94,0.2)]",
          labelBr: "Normal"
        };
    }
  };

  // Defines dynamic styles for priority selection buttons in the modal
  // Modificado: Botão do meio agora usa Âmbar
  const getModalPriorityStyle = (p: Priority, isSelected: boolean) => {
    if (!isSelected) return 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50';
    switch (p) {
      case 'high': return 'bg-red-50 text-red-700 border-red-500 shadow-sm shadow-red-500/20';
      case 'medium': return 'bg-amber-50 text-amber-800 border-amber-500 shadow-sm shadow-amber-500/20'; // Âmbar aqui
      case 'low': return 'bg-green-50 text-green-700 border-green-500 shadow-sm shadow-green-500/20';
    }
  };

  if (loadingApp) return <div className="h-screen bg-neutral-200 flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="flex h-screen bg-neutral-200 font-sans text-black overflow-hidden">
      
      {/* Sidebar */}
      <aside className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col hidden md:flex">
        <div className="p-6 border-b flex items-center gap-3 bg-black text-white">
          <CheckSquare className="w-7 h-7" />
          <h1 className="font-extrabold text-2xl tracking-wider uppercase">Tasker</h1>
        </div>
        
        {/* Boards Section */}
        <div className="px-4 pt-4 pb-2 flex justify-between items-center">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Meus Quadros</span>
          <button onClick={() => setIsAddingBoard(!isAddingBoard)} className="p-1 hover:bg-gray-200 rounded transition-colors">
            <Plus className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="p-3 flex-1 overflow-y-auto space-y-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-300 transition-colors">
          {isAddingBoard && (
            <form onSubmit={handleCreateBoard} className="mb-2 p-2 bg-white rounded-lg border border-gray-200 shadow-sm animate-in fade-in slide-in-from-top-1">
              <input autoFocus required value={newBoardTitle} onChange={e => setNewBoardTitle(e.target.value)} placeholder="Nome do Quadro..." className="w-full text-sm font-bold bg-transparent outline-none mb-2" />
              <div className="flex gap-1">
                <button type="submit" className="flex-1 bg-black text-white text-[10px] py-1.5 rounded font-bold">Salvar</button>
                <button type="button" onClick={() => setIsAddingBoard(false)} className="flex-1 bg-gray-100 text-gray-600 text-[10px] py-1.5 rounded font-bold">Cancelar</button>
              </div>
            </form>
          )}

          {boards.map(b => (
            <div key={b.id} className={`group flex items-center justify-between rounded-lg transition-all ${currentBoard?.id === b.id ? "bg-black text-white shadow" : "hover:bg-gray-200 text-gray-600"}`}>
              <button onClick={() => setCurrentBoard(b)} className="flex-1 text-left px-3 py-2 text-sm font-bold truncate">
                {b.title}
              </button>
              <button onClick={() => setBoardToDelete(b)} className={`p-2 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500 ${currentBoard?.id === b.id ? "text-gray-300 hover:text-red-400" : ""}`} title="Excluir Quadro">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b px-6 py-4 flex justify-between items-center shadow-sm">
          <h2 className="text-xl font-black uppercase tracking-tight">{currentBoard?.title || "Nenhum Quadro Selecionado"}</h2>
          <button onClick={() => supabase.auth.signOut().then(() => router.push("/login"))} className="text-xs font-bold text-gray-400 hover:text-black transition-colors">SAIR</button>
        </header>

        <main className="flex-1 p-6 overflow-x-auto">
          {currentBoard ? (
            <DragDropContext onDragEnd={onDragEnd}>
              <div className="flex gap-6 items-start h-full pb-4">
                {columns.map((column) => (
                  <div key={column.id} className="bg-neutral-300/50 rounded-xl w-80 flex-shrink-0 flex flex-col max-h-full border border-gray-300/50 shadow-sm">
                    
                    {/* Column Header com Edição */}
                    <div className="p-4 flex justify-between items-center group">
                      {editingColumn?.id === column.id ? (
                        <input 
                          autoFocus 
                          maxLength={20}
                          className="bg-white border-2 border-black px-2 py-1 rounded text-sm font-bold w-full outline-none"
                          value={editingColumn.title}
                          onChange={(e) => setEditingColumn({...editingColumn, title: e.target.value})}
                          onBlur={() => handleUpdateColumnTitle(column.id, editingColumn.title)}
                          onKeyDown={(e) => e.key === 'Enter' && handleUpdateColumnTitle(column.id, editingColumn.title)}
                        />
                      ) : (
                        <div className="flex items-center justify-between w-full">
                          <span className="font-bold text-sm uppercase tracking-wide truncate pr-2">{column.title}</span>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setEditingColumn(column)} className="p-1 hover:bg-white rounded text-gray-400 hover:text-black transition-colors" title="Renomear Coluna"><Edit2 className="w-3 h-3" /></button>
                            <button onClick={() => setColToDelete(column)} className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-600 transition-colors" title="Excluir Coluna"><Trash2 className="w-3 h-3" /></button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Tasks List Container */}
                    <div className="flex-1 overflow-y-auto px-3 pb-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-400 Transition-colors">
                      <Droppable droppableId={column.id}>
                        {(provided) => (
                          <div ref={provided.innerRef} {...provided.droppableProps} className="min-h-[50px]">
                            {column.tasks.map((task, index) => {
                              const priorityStyles = getPriorityStyles(task.priority);
                              const isExpanded = expandedTaskIds.includes(task.id);
                              
                              return (
                                <Draggable key={task.id} draggableId={task.id} index={index}>
                                  {(provided) => (
                                    <div 
                                      ref={provided.innerRef} 
                                      {...provided.draggableProps} 
                                      {...provided.dragHandleProps} 
                                      // Card visual implementation with distinct colored glow and border
                                      className={`bg-white p-3 rounded-lg mb-3 border shadow transition-all group/task relative ${priorityStyles.cardGlow}`}
                                    >
                                      {/* Action Buttons (Edit/Delete) */}
                                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover/task:opacity-100 transition-opacity z-10 bg-white/90 backdrop-blur-sm rounded-md p-0.5 border">
                                        <button onClick={() => {setEditingTask(task); setTaskTitle(task.title); setTaskDescription(task.description); setTaskPriority(task.priority); setActiveColumnId(column.id); setIsTaskModalOpen(true)}} className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-black transition-colors"><Edit2 className="w-3 h-3" /></button>
                                        <button onClick={() => setTaskToDelete({ id: task.id, columnId: column.id })} className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-600 transition-colors"><Trash2 className="w-3 h-3" /></button>
                                      </div>
                                      
                                      <p className="font-bold text-sm mb-1 pr-12 text-black leading-tight">{task.title}</p>
                                      
                                      {/* Expandable Description */}
                                      {task.description && (
                                        <div onClick={() => toggleTaskExpansion(task.id)} className="cursor-pointer mb-2 group/desc pt-1">
                                          <p className={`text-[10px] text-gray-600 transition-all leading-relaxed whitespace-pre-wrap ${isExpanded ? '' : 'line-clamp-2'}`}>
                                            {task.description}
                                          </p>
                                          <div className="flex items-center gap-1 text-[8px] font-bold text-gray-300 mt-1.5 group-hover/desc:text-black transition-colors uppercase tracking-wider">
                                            {isExpanded ? <><ChevronUp className="w-3 h-3"/> Menos</> : <><ChevronDown className="w-3 h-3"/> Ver detalhes</>}
                                          </div>
                                        </div>
                                      )}
                                      
                                      {/* Priority Label with BR names */}
                                      <div className={`text-[8px] font-black uppercase inline-block px-2 py-0.5 rounded-full border tracking-wider mt-1 ${priorityStyles.label}`}>
                                        {priorityStyles.labelBr}
                                      </div>
                                    </div>
                                  )}
                                </Draggable>
                              );
                            })}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </div>

                    {/* Add Task Button */}
                    <div className="p-3">
                      <button onClick={() => {setEditingTask(null); setTaskTitle(""); setTaskDescription(""); setTaskPriority("low"); setActiveColumnId(column.id); setIsTaskModalOpen(true)}} className="w-full flex items-center gap-2 p-2.5 text-xs font-bold text-gray-500 hover:text-black hover:bg-white rounded-xl transition-all border border-transparent hover:border-gray-200 shadow-sm hover:shadow-md"><Plus className="w-4 h-4" /> ADICIONAR TAREFA</button>
                    </div>
                  </div>
                ))}

                {/* Add Column Button */}
                {columns.length < 10 && (
                  <div className="w-80 flex-shrink-0">
                    {isAddingColumn ? (
                      <form onSubmit={handleCreateColumn} className="bg-white p-4 rounded-xl border-2 border-black shadow-2xl animate-in fade-in zoom-in-95">
                        <input autoFocus required maxLength={20} placeholder="Título da Coluna..." className="w-full px-3 py-2 bg-gray-50 border rounded-lg mb-3 text-sm font-bold outline-none focus:ring-2 focus:ring-black" value={newColTitle} onChange={(e) => setNewColTitle(e.target.value)} />
                        <div className="flex gap-2">
                          <button type="submit" className="flex-1 bg-black text-white text-[10px] font-black py-2 rounded-lg hover:bg-gray-800 transition-colors">CRIAR</button>
                          <button type="button" onClick={() => setIsAddingColumn(false)} className="flex-1 bg-gray-100 text-gray-500 text-[10px] font-black py-2 rounded-lg hover:bg-gray-200 transition-colors">CANCELAR</button>
                        </div>
                      </form>
                    ) : (
                      <button onClick={() => setIsAddingColumn(true)} className="w-full flex items-center justify-center gap-3 p-5 border-2 border-dashed border-gray-400 rounded-xl text-gray-500 hover:text-black hover:border-black hover:bg-white/50 transition-all font-black text-xs uppercase tracking-widest">
                        <PlusCircle className="w-5 h-5" /> NOVA COLUNA
                      </button>
                    )}
                  </div>
                )}
              </div>
            </DragDropContext>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <Layout className="w-20 h-20 mb-6 opacity-10" />
              <p className="font-bold text-xl mb-1">Inicie um projeto</p>
              <p className="text-sm">Crie ou selecione um quadro na barra lateral para começar.</p>
            </div>
          )}
        </main>
      </div>

      {/* --- Modals --- */}

      {/* Task Creation/Edit Modal */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 overflow-hidden">
            <h2 className="text-lg font-black mb-6 uppercase tracking-tighter text-black">{editingTask ? "Editar" : "Nova"} Tarefa</h2>
            <form onSubmit={handleSaveTask} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Título (máx 20)</label>
                <input maxLength={20} required value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="O que precisa ser feito?" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-black font-bold text-black" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Descrição (máx 300)</label>
                <textarea maxLength={300} value={taskDescription} onChange={e => setTaskDescription(e.target.value)} placeholder="Adicione detalhes sobre a tarefa..." rows={5} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-black text-sm text-black resize-none leading-relaxed" />
              </div>
              
              {/* Priority Selectors with dynamic BR coloring */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2.5">Gravidade</label>
                <div className="flex gap-2.5">
                  {(['low', 'medium', 'high'] as Priority[]).map(p => (
                    <button key={p} type="button" onClick={() => setTaskPriority(p)} className={`flex-1 py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${getModalPriorityStyle(p, taskPriority === p)}`}>
                      {p === 'low' ? 'Normal' : p === 'medium' ? 'Importante' : 'Urgente'}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="flex gap-3 pt-4 border-t border-gray-100 mt-6">
                <button type="button" onClick={() => setIsTaskModalOpen(false)} className="flex-1 py-3.5 font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">Cancelar</button>
                <button type="submit" disabled={isSubmitting} className="flex-[2] bg-black text-white font-bold py-3.5 rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-colors shadow-lg shadow-black/20 flex items-center justify-center gap-2">
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : editingTask ? "Salvar Alterações" : "Criar Tarefa"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Task Confirmation Modal */}
      {taskToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-xs text-center shadow-2xl animate-in fade-in zoom-in-95">
            <div className="bg-red-50 text-red-600 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100"><AlertCircle /></div>
            <h3 className="font-bold text-base mb-2 text-black">Excluir Tarefa?</h3>
            <p className="text-[11px] text-gray-500 mb-6 leading-relaxed">Você está prestes a apagar essa tarefa. Essa ação não pode ser desfeita e os dados serão perdidos.</p>
            <div className="flex gap-2.5">
              <button onClick={() => setTaskToDelete(null)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-200 transition-colors">CANCELAR</button>
              <button onClick={handleDeleteTask} className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors">EXCLUIR</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Column Confirmation Modal */}
      {colToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-xs text-center shadow-2xl animate-in fade-in zoom-in-95">
            <div className="bg-red-50 text-red-600 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100"><AlertCircle /></div>
            <h3 className="font-bold text-base mb-2 text-black">Excluir Coluna?</h3>
            <p className="text-[11px] text-gray-500 mb-6 leading-relaxed">A coluna <b>{colToDelete.title}</b> e todas as tarefas dentro dela serão apagadas para sempre.</p>
            <div className="flex gap-2.5">
              <button onClick={() => setColToDelete(null)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-200 transition-colors">CANCELAR</button>
              <button onClick={handleDeleteColumn} className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors">EXCLUIR</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Board Confirmation Modal */}
      {boardToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-xs text-center shadow-2xl animate-in fade-in zoom-in-95">
            <div className="bg-red-50 text-red-600 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100"><AlertCircle /></div>
            <h3 className="font-bold text-base mb-2 text-black">Excluir Quadro?</h3>
            <p className="text-[11px] text-gray-500 mb-6 leading-relaxed">O quadro <b>{boardToDelete.title}</b> será apagado para sempre, junto com todas as colunas e tarefas nele.</p>
            <div className="flex gap-2.5">
              <button onClick={() => setBoardToDelete(null)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-200 transition-colors">CANCELAR</button>
              <button onClick={handleDeleteBoard} className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors">EXCLUIR</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 z-[120] animate-in slide-in-from-right-5 ${toast.type === 'error' ? 'bg-red-600' : 'bg-black'} text-white`}>
          <CheckCircle className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase tracking-widest">{toast.message}</span>
        </div>
      )}
    </div>
  );
}