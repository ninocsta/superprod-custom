# Fork + Build + Install (Linux) — ninocsta

Este guia deixa o projeto pronto para:

- versionar no seu GitHub pessoal
- manter sincronizado com o projeto oficial (`upstream`)
- atualizar manualmente quando quiser
- gerar build e instalar como app Linux localmente

## 0) Pré-requisito

Seu `~/.ssh/config`:

```sshconfig
Host github-ninocsta
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_ed25519_pessoal
    IdentitiesOnly yes
```

Teste:

```bash
ssh -T git@github-ninocsta
```

## 1) Remotes (já configurado)

```bash
git remote -v
```

Esperado:

- `origin` -> `git@github-ninocsta:ninocsta/superprod-custom.git`
- `upstream` -> `https://github.com/super-productivity/super-productivity.git`

## 2) Primeiro push do fork

Seu repositório usa hook `pre-push` que roda `npm run test` completo.
Como você quer fluxo manual mais rápido, faça:

```bash
git push -u origin master --no-verify
```

## 3) Atualização manual do upstream (quando quiser)

```bash
git fetch upstream
git checkout master
git rebase upstream/master
# resolver conflitos se houver
git push --force-with-lease origin master --no-verify
```

## 3.1) Quando você tem mudanças locais (diff) e quer atualizar

```bash
cd ~/Documentos/superprod

git add -A
git commit -m "feat(daily): improve daily workflow and task linking" --no-verify

git fetch upstream
git checkout master
git rebase upstream/master
# se houver conflito:
#   git add <arquivo>
#   git rebase --continue

git push --force-with-lease origin master --no-verify
```

### Conflito no rebase

```bash
git status
# editar arquivos com conflito
git add <arquivo>
git rebase --continue
```

Abortar se precisar:

```bash
git rebase --abort
```

## 4) Build + instalação Linux (rápido, sem suite completa)

### Produção sem testes pesados

```bash
npm ci
npm run buildAllElectron:noTests:prod
npx electron-builder --linux deb
sudo dpkg -i .tmp/app-builds/superProductivity*.deb
```

### Alternativa mais rápida (stage)

```bash
npm ci
npm run localInstall:quick
```

## 5) Comando único do seu ciclo

```bash
git fetch upstream && git checkout master && git rebase upstream/master && git push --force-with-lease origin master --no-verify && npm ci && npm run buildAllElectron:noTests:prod && npx electron-builder --linux deb && sudo dpkg -i .tmp/app-builds/superProductivity*.deb
```

## 5.1) Copiar e colar (recomendado)

Se quiser menos dor de cabeça com conflito no `rebase`, use em blocos:

```bash
cd ~/Documentos/superprod

git fetch upstream
git checkout master
git rebase upstream/master
# se houver conflito:
#   git add <arquivo>
#   git rebase --continue

git push --force-with-lease origin master --no-verify

npm ci
npm run buildAllElectron:noTests:prod
npx electron-builder --linux deb
sudo dpkg -i .tmp/app-builds/superProductivity*.deb
```

## 5.2) Copiar e colar completo (COMMIT + UPDATE + BUILD + INSTALL)

```bash
cd ~/Documentos/superprod

git add -A
git commit -m "feat(daily): improve daily workflow and task linking" --no-verify

git fetch upstream
git checkout master
git rebase upstream/master
# se houver conflito:
#   git add <arquivo>
#   git rebase --continue

git push --force-with-lease origin master --no-verify

npm ci
npm run buildAllElectron:noTests:prod
npx electron-builder --linux deb
sudo dpkg -i .tmp/app-builds/superProductivity*.deb
```

## 6) Dica para reduzir dor com conflitos

```bash
git config --global rerere.enabled true
git config --global rerere.autoupdate true
```
