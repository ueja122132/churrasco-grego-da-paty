import sys
import os

filepath = 'src/pages/FinancePage.tsx'
if not os.path.exists(filepath):
    print(f"File {filepath} not found")
    sys.exit(1)

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Target 1: Inventory Card Actions
target1 = '<span className="text-[10px] text-gray-400">{new Date(item.updated_at).toLocaleDateString()}</span>'
replacement1 = """<div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button 
                             onClick={() => {
                               setEditingMaterialId(item.id);
                               setNewMaterial({
                                 name: item.name,
                                 unit: item.unit,
                                 category: (item as any).category || "Proteína",
                                 initial_cost: String(item.current_avg_cost || "")
                               });
                               setIsAddingNewMaterial(true);
                             }}
                             className="p-1.5 bg-white text-indigo-600 rounded-lg shadow-sm hover:bg-indigo-50"
                             title="Editar Material"
                           >
                              <Edit2 size={14} />
                           </button>
                           <button 
                             onClick={() => handleDeleteMaterial(item.id)}
                             className="p-1.5 bg-white text-red-600 rounded-lg shadow-sm hover:bg-red-50"
                             title="Excluir Material"
                           >
                              <Trash2 size={14} />
                           </button>
                        </div>"""

if target1 in content:
    content = content.replace(target1, replacement1)
    print("Applied target1")
else:
    print("Target1 NOT found")

# Target 2: Modal Title
target2 = '<Layers className="text-orange-600" /> Novo Material'
replacement2 = '<Layers className="text-orange-600" /> {editingMaterialId ? "Editar Material" : "Novo Material"}'

if target2 in content:
    content = content.replace(target2, replacement2)
    print("Applied target2")
else:
    print("Target2 NOT found")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
