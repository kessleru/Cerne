// Python: bibliotecas, frameworks web, IA e a biblioteca padrão.
import { repos } from '../ajuda';

export default repos([
  {
    repo: 'karpathy/micrograd', famoso: 'Aprender', nota: 'Autograd inteiro em ~100 linhas', nivel: 'iniciante', lang: 'Python', temas: ['ia'], tipo: 'tutorial', start: 'micrograd/engine.py',
  },
  {
    repo: 'pallets/click', famoso: 'Ferramentas', nota: 'CLI com API exemplar', nivel: 'intermediário', lang: 'Python', temas: ['cli'], tipo: 'biblioteca', start: 'src/click/core.py',
  },
  {
    repo: 'psf/requests', famoso: 'Back-end', nota: 'Design de API para humanos', nivel: 'intermediário', lang: 'Python', temas: ['apis'], tipo: 'biblioteca', api: ['REST'], stack: ['urllib3'], start: 'src/requests/sessions.py',
  },
  {
    repo: 'pallets/flask', famoso: 'Back-end', nota: 'Framework web legível', nivel: 'intermediário', lang: 'Python', temas: ['apis'], tipo: 'framework', api: ['REST'], stack: ['Werkzeug', 'WSGI'], start: 'src/flask/app.py',
  },
  {
    repo: 'fastapi/fastapi', famoso: 'Back-end', nota: 'Tipos guiando a API', nivel: 'intermediário', lang: 'Python', temas: ['apis'], tipo: 'framework', api: ['REST'], stack: ['Starlette', 'Pydantic', 'ASGI', 'OpenAPI'], start: 'fastapi/routing.py',
  },
  {
    repo: 'encode/starlette', famoso: 'Back-end', nota: 'O ASGI por baixo do FastAPI', nivel: 'intermediário', lang: 'Python', temas: ['apis'], tipo: 'framework', api: ['REST', 'WebSocket'], stack: ['ASGI'], start: 'starlette/routing.py',
  },
  {
    repo: 'fastapi/full-stack-fastapi-template', famoso: 'Back-end', nota: 'API completa: auth, banco e testes', nivel: 'intermediário', lang: 'Python', temas: ['apis', 'arquitetura'], tipo: 'exemplo', api: ['REST'], stack: ['FastAPI', 'SQLModel', 'PostgreSQL', 'JWT', 'Docker'], start: 'backend/app/api/routes/items.py',
  },
  {
    repo: 'python/cpython', famoso: 'Linguagens', nota: 'A stdlib escrita em Python', nivel: 'avançado', lang: 'Python', temas: [], tipo: 'linguagem', start: 'Lib/json/encoder.py',
  },
  {
    repo: 'TheAlgorithms/Python', famoso: 'Aprender', nota: 'Centenas de algoritmos em Python', nivel: 'iniciante', lang: 'Python', temas: ['algoritmos'], tipo: 'tutorial', start: 'sorts/quick_sort.py',
  },
  {
    repo: 'karpathy/nanoGPT', famoso: 'Aprender', nota: 'Um GPT em ~300 linhas', nivel: 'intermediário', lang: 'Python', temas: ['ia'], tipo: 'tutorial', stack: ['PyTorch'], start: 'model.py',
  },
  {
    repo: 'rasbt/LLMs-from-scratch', famoso: 'Aprender', nota: 'Um LLM do zero, em notebooks', nivel: 'intermediário', lang: 'Python', temas: ['ia'], tipo: 'tutorial', stack: ['PyTorch'], start: 'ch04/01_main-chapter-code/ch04.ipynb',
  },
  {
    repo: 'huggingface/transformers', famoso: 'IA', nota: 'O GPT-2 de referência', nivel: 'avançado', lang: 'Python', temas: ['ia'], tipo: 'biblioteca', stack: ['PyTorch'], start: 'src/transformers/models/gpt2/modeling_gpt2.py',
  },
  {
    repo: 'kanaka/mal', famoso: 'Aprender', nota: 'Um Lisp em 11 passos', nivel: 'intermediário', lang: 'Python', temas: ['compiladores'], tipo: 'tutorial', start: 'impls/python3/step1_read_print.py',
  },
  {
    repo: 'django/django', famoso: 'Back-end', nota: 'Web em Python, com baterias', nivel: 'avançado', lang: 'Python', temas: ['apis'], tipo: 'framework', stack: ['ORM', 'WSGI'], start: 'django/db/models/query.py',
  },
  {
    repo: 'pytorch/pytorch', famoso: 'IA', nota: 'Deep learning', nivel: 'avançado', lang: 'Python', temas: ['ia'], tipo: 'biblioteca', start: 'torch/nn/modules/linear.py',
  },
  {
    repo: 'home-assistant/core', famoso: 'Ferramentas', nota: 'Automação residencial', nivel: 'avançado', lang: 'Python', temas: ['arquitetura'], tipo: 'aplicação', start: 'homeassistant/core.py',
  },
]);
