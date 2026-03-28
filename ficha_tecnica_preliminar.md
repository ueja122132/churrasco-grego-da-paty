# Planejamento: Ficha Técnica e Controle de Estoque 🍢📊

Este documento apresenta a proposta inicial de **Ficha Técnica** para os itens do cardápio do Churrasco Grego da Paty. O objetivo é permitir que o sistema calcule automaticamente o consumo de insumos por venda.

> [!IMPORTANT]
> Os valores abaixo são baseados em médias de mercado. É necessário que o ADM valide se as porções reais da loja seguem este padrão.

---

## 1. Sanduíche Tradicional (Pão Francês)
*Base para o item "Churrasco Grego Tradicional"*

| Insumo | Quantidade Estimada | Observação |
| :--- | :--- | :--- |
| **Carne (Mista)** | 150g - 180g | Peso da carne já assada e casqueada |
| **Pão Francês** | 1 unidade | Aprox. 50g |
| **Vinagrete/Salada** | 40g | Mix de tomate, cebola e repolho |
| **Molho Especial** | 25ml | Maionese temperada ou molho de alho |

---

## 2. Churrasco Grego no Prato
*Base para o item "Churrasco Grego no Prato"*

| Insumo | Quantidade Estimada | Observação |
| :--- | :--- | :--- |
| **Carne (Mista)** | 250g - 300g | Porção reforçada |
| **Farofa Temperada** | 80g | Acompanhamento padrão |
| **Arroz (se houver)**| 150g | Opcional conforme o preparo da Paty |
| **Salada Completa** | 100g | Alface, tomate, cebola |
| **Molho** | 50ml | Servido em potinho ou sobre a carne |

---

## 3. Combos e Bebidas

### Combo (2 Tradicional + 1 Bebida)
- Aplica-se a ficha técnica do **Sanduíche Tradicional x 2**.
- Contabiliza 1 unidade da bebida selecionada.

### Bebidas
- **Sucos Naturais:** 300ml de polpa/fruta + água/açúcar conforme preparo.
- **Refrigerantes/Água:** 1 unidade (lata ou garrafa).

---

## Próximos Passos Sugeridos 🚀

1. **Validação:** Ajeu, confirme se os pesos da carne (150g para pão e 250g para prato) condizem com a sua operação.
2. **Cadastro no Banco:** Após aprovado, podemos criar uma tabela de `inventory_items` (estoque bruto) e vincular aos `products` através de uma tabela de composição.
3. **Automação (n8n):** Podemos criar um workflow que, a cada pedido "entregue", dê baixa automática nas gramas de carne e unidades de pão no estoque.

**A PATY está no aguardo do seu feedback para seguir com a estruturação!** 🍢🫡
