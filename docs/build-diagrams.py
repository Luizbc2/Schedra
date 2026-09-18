"""Generate editable Excalidraw boards and matching visual previews."""
import json
import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).parent / "diagrams"
OUT.mkdir(exist_ok=True)
INK, MUTED, BORDER, ACCENT = "#24282B", "#61686D", "#C9D1D3", "#12695B"
elements, previews, issues = [], [], []
W, H = 1440, 920
font_path = "C:/Windows/Fonts/arial.ttf"

def font(size):
    return ImageFont.truetype(font_path, size)

def base(kind, x, y, w, h, color=INK, fill="transparent"):
    e = dict(id=f"schedra-{len(elements):05}", type=kind, x=x+ox, y=y+oy, width=w, height=h,
             angle=0, strokeColor=color, backgroundColor=fill, fillStyle="solid", strokeWidth=1,
             strokeStyle="solid", roughness=0, opacity=100, groupIds=[], frameId=None,
             roundness=None, seed=100+len(elements), version=1, versionNonce=123+len(elements),
             isDeleted=False, boundElements=[], updated=1788868800000, link=None, locked=False)
    elements.append(e)
    return e

def text(x, y, value, size=20, color=INK, width=None, center=False, container=None):
    f = font(size)
    lines = []
    for paragraph in value.split("\n"):
        line = ""
        for word in paragraph.split(" "):
            trial = f"{line} {word}".strip()
            if width and f.getlength(trial) > width and line:
                lines.append(line); line = word
            else: line = trial
        lines.append(line)
    value = "\n".join(lines)
    actual = max(f.getlength(line) for line in lines)
    tw = width or math.ceil(actual)+2
    th = len(lines)*size*1.25
    if actual > tw+1: issues.append(f"Text too wide: {value}")
    e = base("text", x, y, tw, th, color)
    e.update(text=value, originalText=value, fontSize=size, fontFamily=2, textAlign="center" if center else "left",
             verticalAlign="middle" if container else "top", containerId=container["id"] if container else None,
             autoResize=False, lineHeight=1.25)
    if container: container["boundElements"].append({"id":e["id"],"type":"text"})
    for i,line in enumerate(lines):
        tx = x+(tw-f.getlength(line))/2 if center else x
        draw.text((tx,y+i*size*1.25),line,font=f,fill=color,anchor="lt")
    if x < 0 or y < 0 or x+tw > W+1 or y+th > H+1: issues.append(f"Outside board: {value}")
    return e

def box(x,y,w,h,label="",fill="#FFFFFF",size=20,ellipse=False):
    e=base("ellipse" if ellipse else "rectangle",x,y,w,h,BORDER,fill)
    if ellipse: draw.ellipse((x,y,x+w,y+h),fill=fill,outline=BORDER,width=1)
    else: draw.rectangle((x,y,x+w,y+h),fill=fill,outline=BORDER,width=1)
    if label:
        # Bound labels share the exact shape center, including wrapped multi-line text.
        f=font(size); lines=[]
        for paragraph in label.split("\n"):
            line=""
            for word in paragraph.split():
                trial=(line+" "+word).strip()
                if f.getlength(trial)>w-36 and line: lines.append(line);line=word
                else: line=trial
            lines.append(line)
        height=len(lines)*size*1.25
        if height>h-20: issues.append(f"Overflow: {label}")
        text(x+18,y+(h-height)/2,"\n".join(lines),size,width=w-36,center=True,container=e)
    return e

def line(points, color=BORDER, arrow=False, dashed=False, label=None):
    x,y=points[0]; rel=[[px-x,py-y] for px,py in points]
    e=base("arrow" if arrow else "line",x,y,max(p[0] for p in rel)-min(p[0] for p in rel),max(p[1] for p in rel)-min(p[1] for p in rel),color)
    e.update(points=rel,startBinding=None,endBinding=None,startArrowhead=None,endArrowhead="arrow" if arrow else None,
             lastCommittedPoint=None,elbowed=False,strokeStyle="dashed" if dashed else "solid")
    for (x1,y1),(x2,y2) in zip(points,points[1:]):
        if dashed:
            length=math.hypot(x2-x1,y2-y1)
            for pos in range(0,int(length),12):
                a=pos/max(length,1);b=min(pos+6,length)/max(length,1)
                draw.line((x1+(x2-x1)*a,y1+(y2-y1)*a,x1+(x2-x1)*b,y1+(y2-y1)*b),fill=color,width=1)
        else: draw.line((x1,y1,x2,y2),fill=color,width=1)
    if arrow:
        a,b=points[-2],points[-1];angle=math.atan2(b[1]-a[1],b[0]-a[0])
        for d in [-.4,.4]: draw.line((b[0],b[1],b[0]-12*math.cos(angle+d),b[1]-12*math.sin(angle+d)),fill=color,width=2)
    if label:
        a,b=points[0],points[1]
        text(min(a[0],b[0])+32,min(a[1],b[1])-44,label,18,color)
    return e

def page(n,title,subtitle):
    global ox,oy,draw,img
    ox=((n-1)%3)*1560;oy=((n-1)//3)*1040
    img=Image.new("RGB",(W,H),"white");draw=ImageDraw.Draw(img)
    base("rectangle",0,0,W,H,BORDER,"#FFFFFF")
    text(56,42,f"{n:02}",30,ACCENT)
    text(124,38,title,32,width=1130)
    text(124,84,subtitle,18,MUTED,width=1180)
    line([(56,128),(1384,128)])
    line([(56,H-58),(1384,H-58)])
    text(56,H-37,"Schedra  /  Engenharia de software",15,MUTED)
    text(1230,H-37,f"{n:02} / 09",15,MUTED,width=154,center=True)

def finish(n):
    img.save(OUT/f"{n:02}.png")
    previews.append(img.resize((432,276)))

page(1,"Arquitetura futura","PWA, sincronização e notificações ampliam a plataforma existente.")
box(60,210,245,110,"Aplicação web\nReact + PWA")
box(60,545,245,110,"Aplicativo Expo\niOS e Android")
box(390,210,245,110,"Service Worker\nCache controlado")
box(390,545,245,110,"Serviço de push\nCanal autorizado")
box(745,345,270,135,"API Express\nAutorização e\nidempotência",fill="#EDF5F2")
box(1100,210,270,110,"Banco de dados\nDados e auditoria")
box(1100,545,270,110,"Processador\nde lembretes")
line([(315,265),(378,265)],ACCENT,True)
line([(645,265),(730,265),(730,390),(733,390)],ACCENT,True)
line([(315,600),(340,600),(340,445),(733,445)],ACCENT,True)
line([(1027,390),(1088,390),(1088,265),(1088,265)],ACCENT,True)
line([(1235,533),(1235,332)],ACCENT,True)
line([(1088,600),(647,600)],ACCENT,True)
text(60,715,"Limites da proposta",22)
text(60,758,"O Service Worker não substitui a API. Credenciais e respostas administrativas não entram no cache.\nOperações administrativas permanecem online; notificações dependem de consentimento revogável.",19,MUTED,width=1300)
finish(1)

page(2,"Modelo de dados futuro","Entidades propostas para lembretes, dispositivos e sincronização offline.")
def entity(x,y,name,fields,w=250,h=145):
    box(x,y,w,h)
    text(x+16,y+14,name,19,ACCENT,width=w-32)
    line([(x+16,y+46),(x+w-16,y+46)])
    text(x+16,y+58,fields,17,width=w-32)

entity(580,185,"USERS","PK id\nemail, role, active",280)
entity(100,185,"PREFERENCES","PK id; FK userId\nchannel, leadMinutes\nenabled, privacy",280)
entity(1060,185,"DEVICE_TOKENS","PK id; FK userId\ntokenHash, platform\nrevokedAt",280)
line([(568,255),(390,255)],ACCENT,True,label="1 : N")
line([(870,255),(1048,255)],ACCENT,True,label="1 : N")
entity(60,470,"EVENTS","APPOINTMENTS ou\nPERSONAL_EVENTS\nstartsAt, version",250)
entity(440,470,"REMINDERS","PK id; FK event\nscheduledFor\nstatus",280)
entity(855,470,"NOTIFICATIONS","PK id; FK reminderId\nchannel, status\nreadAt",280)
line([(320,540),(428,540)],ACCENT,True,label="1 : N")
line([(730,540),(843,540)],ACCENT,True,label="1 : N")
entity(1165,470,"SYNC_OPERATIONS","PK idempotencyKey\nFK userId; baseVersion\noperation, status",230,165)
line([(720,342),(720,750),(1280,750),(1280,647)],ACCENT,True,label="1 : N")
text(60,790,"As tabelas são propostas. Migrações e contratos devem ser aprovados antes da implementação.",18,MUTED,width=1300)
finish(2)

page(3,"Casos de uso · calendário e offline","Interações futuras para usuários pessoais e empresariais.")
box(365,175,1000,640,fill="#FAFBFB")
text(400,198,"Schedra / Evolução da agenda",20,ACCENT)
box(58,385,250,110,"Usuário autenticado",ellipse=True)
for y,label in [(245,"Selecionar data e consultar resumo"),(355,"Criar compromisso na data"),(465,"Consultar dados recentes offline"),(575,"Sincronizar alteração pendente"),(685,"Resolver conflito")]:
    box(720,y,565,76,label,ellipse=True)
    line([(318,440),(470,440),(470,y+38),(708,y+38)])
text(58,735,"A agenda continua respeitando\no modo e o escopo ativos.",17,MUTED,width=280)
finish(3)

page(4,"Casos de uso · notificações e admin web","Consentimento do usuário e autorização da API são obrigatórios.")
box(365,170,1000,650,fill="#FAFBFB")
text(400,194,"Schedra / Novos módulos",20,ACCENT)
box(58,280,250,100,"Usuário autenticado",ellipse=True)
box(58,620,250,100,"Administrador",ellipse=True)
for y,label in [(225,"Configurar lembrete"),(330,"Autorizar dispositivo"),(435,"Consultar central de notificações")]:
    box(720,y,565,75,label,ellipse=True)
    line([(318,330),(475,330),(475,y+38),(708,y+38)])
for y,label in [(585,"Pesquisar usuários no painel web"),(690,"Alterar papel ou estado com auditoria")]:
    box(720,y,565,75,label,ellipse=True)
    line([(318,670),(535,670),(535,y+38),(708,y+38)])
text(58,760,"A interface não concede permissão;\no backend revalida cada ação.",17,MUTED,width=280)
finish(4)

def activity(n,title,steps,error1,error2,note):
    page(n,title,"Fluxo principal e recuperação de falhas.")
    xs=[70,340,610,880,1150]
    for i,label in enumerate(steps):
        text(xs[i],187,str(i+1).zfill(2),18,ACCENT)
        box(xs[i],230,210,120,label,size=20,fill="#EDF5F2" if i==4 else "#FFFFFF")
        if i<4: line([(xs[i]+220,290),(xs[i+1]-10,290)],ACCENT,True)
    box(270,465,370,116,error1,fill="#FAF4F4",size=19)
    line([(445,362),(445,453)],MUTED,True)
    text(466,397,"Inválido",16,MUTED)
    line([(258,523),(120,523),(120,362)],MUTED,True)
    box(845,465,470,116,error2,fill="#FAF4F4",size=19)
    line([(985,362),(985,453)],MUTED,True)
    text(1006,397,"Falha",16,MUTED)
    text(70,682,"Critério de sucesso",22)
    text(70,732,note,21,MUTED,width=1290)
    finish(n)

activity(5,"Atividade · selecionar uma data",["Selecionar\nDia no calendário","Consultar\nResumo autorizado","Adaptar UI\nDesktop ou mobile","Escolher ação\nNovo ou detalhes","Abrir destino\nData preservada"],"Sem dados no dia\nExibir estado vazio e Novo","Falha na consulta\nManter calendário e permitir tentar novamente","Desktop usa pop-up ancorado; mobile usa painel inferior. Fechar devolve o foco ao dia selecionado.")
activity(6,"Atividade · entregar lembrete",["Salvar evento\nCom lembrete","Validar horário\nE consentimento","Agendar\nCanal disponível","Processar\nNo horário devido","Registrar entrega\nOu falha"],"Permissão negada\nSalvar evento sem push","Canal indisponível\nRegistrar na central interna","Editar ou excluir o evento substitui ou cancela o lembrete pendente. O usuário pode revogar o consentimento.")

def participants(names,end=842):
    global px
    px=[155,510,865,1220]
    for x,name in zip(px,names):
        box(x-100,172,200,64,name,size=18,fill="#F5F7F7")
        line([(x,254),(x,end)],dashed=True)

def msg(a,b,y,label,reply=False):
    line([(px[a],y),(px[b],y)],MUTED if reply else ACCENT,True,reply)
    # Reserve room for the native Excalidraw arrowhead and a full line of text.
    e=text(min(px[a],px[b])+36,y-48,label,18,MUTED if reply else INK,width=abs(px[b]-px[a])-72)
    if e['y']+e['height']>oy+y-18:
        issues.append(f"Message too close to its arrow: {label}")

page(7,"Sequência · sincronização offline","A fila usa chave idempotente e versão base para evitar duplicidade e sobrescrita silenciosa.")
participants(["Usuário","Aplicação web","Service Worker","API / Banco"],end=794)
for index,(a,b,label,r) in enumerate([(0,1,"Confirmar alteração sem rede",False),(1,2,"Enfileirar operação",False),(2,1,"Estado pendente",True),(2,3,"Conexão voltou: sincronizar",False),(3,2,"200 + nova versão",True),(2,1,"Marcar sincronizado",True),(3,2,"Ou 409 + estado remoto",True),(1,0,"Exibir sucesso ou conflito",True)]):msg(a,b,300+index*68,label,r)
text(70,822,"Operações administrativas continuam online e nunca entram na fila local.",16,MUTED,width=1290)
finish(7)

page(8,"Sequência · administração web","A tela melhora a gestão, mas toda autorização permanece no backend.")
participants(["Administrador","Painel web","API / RBAC","Banco / Auditoria"],end=794)
for index,(a,b,label,r) in enumerate([(0,1,"Pesquisar usuário",False),(1,2,"GET /api/admin/users",False),(2,3,"Revalidar papel e listar",False),(3,2,"Página autorizada",True),(0,1,"Confirmar alteração",False),(1,2,"PATCH papel ou estado",False),(2,3,"Atualizar e auditar",False),(2,1,"200 + usuário atualizado",True)]):msg(a,b,300+index*68,label,r)
text(70,822,"Autoproteção: o administrador não rebaixa, bloqueia ou exclui a própria conta.",16,MUTED,width=1290)
finish(8)

page(9,"Rastreabilidade da proposta","Documentação concluída não significa funcionalidade implementada.")
cols=[66,450,868,1210]
for x,label in zip(cols,["LACUNA","REQUISITOS FUTUROS","ENTREGA PLANEJADA","PRANCHA"]):text(x,180,label,16,MUTED)
rows=[
    ("Calendário sem contexto","RFF01 a RFF05","PR 1 · calendário contextual","03 / 05"),
    ("Sem administração web","RFF14 a RFF17","PR 2 · painel administrativo","04 / 08"),
    ("Sem lembretes ativos","RFF06 a RFF09","PRs 3 e 4 · notificações","02 / 04 / 06"),
    ("Dependência de conexão","RFF10 a RFF13","PRs 5 e 6 · PWA e offline","01 / 03 / 07"),
    ("Privacidade de push","RNFF07","Consentimento e conteúdo seguro","04 / 06"),
    ("Consistência offline","RNFF04 a RNFF06","Idempotência e conflitos","01 / 07"),
    ("Autorização admin","RNFF08","RBAC e auditoria","04 / 08"),
    ("Qualidade futura","RNFF10","Testes antes de concluir","01 a 08"),
]
for i,row in enumerate(rows):
    y=238+i*64
    line([(64,y-14),(1375,y-14)])
    for j,(x,value) in enumerate(zip(cols,row)):text(x,y,value,18,width=[360,388,310,155][j])
text(66,793,"Status atual: proposta documentada. A implementação seguirá o backlog de PRODUCT_EVOLUTION.md.",17,MUTED,width=1310)
finish(9)

# Verify actual text rectangles against every orthogonal connector, not just board edges.
checked_gaps=0
for label in (e for e in elements if e['type']=='text'):
    left,top=label['x']-8,label['y']-8
    right,bottom=label['x']+label['width']+8,label['y']+label['height']+8
    for edge in (e for e in elements if e['type'] in ('line','arrow')):
        points=[(edge['x']+x,edge['y']+y) for x,y in edge['points']]
        for (x1,y1),(x2,y2) in zip(points,points[1:]):
            checked_gaps+=1
            horizontal=y1==y2 and top<y1<bottom and max(x1,x2)>left and min(x1,x2)<right
            vertical=x1==x2 and left<x1<right and max(y1,y2)>top and min(y1,y2)<bottom
            if horizontal or vertical:
                issues.append(f"Connector clearance below 8px: {label['text']} ({edge['id']})")
if issues: raise ValueError(issues)

scene={"type":"excalidraw","version":2,"source":"https://excalidraw.com","elements":elements,
       "appState":{"viewBackgroundColor":"#F1F3F3","theme":"light","gridSize":None},"files":{}}
(OUT/"Schedra-revisado.excalidraw").write_text(json.dumps(scene,ensure_ascii=False,indent=2),encoding="utf8")
contact=Image.new("RGB",(3*448,3*292),"#E4E8E8")
for i,preview in enumerate(previews):contact.paste(preview,((i%3)*448+8,(i//3)*292+8))
contact.save(OUT/"overview.png")
(OUT/"layout-check.json").write_text(json.dumps({"boards":9,"elements":len(elements),"connectorClearanceChecks":checked_gaps,"minimumTextConnectorGap":8,"minimumMessageBaselineGap":18,"overflow":issues},ensure_ascii=False,indent=2),encoding="utf8")
if issues: raise ValueError(issues)
print(f"Generated {len(elements)} editable elements across 9 boards; no text overflow.")
