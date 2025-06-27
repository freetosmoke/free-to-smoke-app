#!/bin/bash

# Script di backup automatico per Free to Smoke App
# Uso: ./backup_script.sh [nome_versione]

set -e

# Colori per output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Funzione per stampare messaggi colorati
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verifica che siamo nella directory corretta
if [ ! -f "package.json" ]; then
    print_error "Errore: package.json non trovato. Esegui lo script dalla root del progetto."
    exit 1
fi

# Nome della versione (parametro opzionale)
VERSION_NAME=${1:-"stable_$(date +%Y%m%d_%H%M%S)"}
BACKUP_DIR="backup"
BACKUP_PATH="$BACKUP_DIR/src_$VERSION_NAME"

print_status "Creazione backup: $VERSION_NAME"

# Crea la directory backup se non esiste
mkdir -p "$BACKUP_DIR"

# Verifica che non esista già un backup con lo stesso nome
if [ -d "$BACKUP_PATH" ]; then
    print_warning "Backup $VERSION_NAME già esistente. Sovrascrivere? (y/N)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        print_error "Backup annullato."
        exit 1
    fi
    rm -rf "$BACKUP_PATH"
fi

# Crea il backup
print_status "Copiando src/ in $BACKUP_PATH..."
cp -r src "$BACKUP_PATH"

# Copia anche i file di configurazione importanti
print_status "Copiando file di configurazione..."
cp package.json "$BACKUP_DIR/package_$VERSION_NAME.json" 2>/dev/null || true
cp package-lock.json "$BACKUP_DIR/package-lock_$VERSION_NAME.json" 2>/dev/null || true
cp tsconfig.json "$BACKUP_DIR/tsconfig_$VERSION_NAME.json" 2>/dev/null || true
cp vite.config.ts "$BACKUP_DIR/vite.config_$VERSION_NAME.ts" 2>/dev/null || true
cp tailwind.config.js "$BACKUP_DIR/tailwind.config_$VERSION_NAME.js" 2>/dev/null || true

# Aggiorna il backup "current"
print_status "Aggiornando backup corrente..."
rm -rf "$BACKUP_DIR/src_stable_current"
cp -r src "$BACKUP_DIR/src_stable_current"

# Crea un file di log con informazioni sul backup
echo "Backup creato: $(date)" > "$BACKUP_DIR/backup_$VERSION_NAME.log"
echo "Versione: $VERSION_NAME" >> "$BACKUP_DIR/backup_$VERSION_NAME.log"
echo "Commit Git: $(git rev-parse HEAD 2>/dev/null || echo 'N/A')" >> "$BACKUP_DIR/backup_$VERSION_NAME.log"
echo "Branch Git: $(git branch --show-current 2>/dev/null || echo 'N/A')" >> "$BACKUP_DIR/backup_$VERSION_NAME.log"

print_status "✅ Backup completato con successo!"
print_status "📁 Percorso: $BACKUP_PATH"
print_status "📝 Log: $BACKUP_DIR/backup_$VERSION_NAME.log"

# Lista tutti i backup disponibili
print_status "\n📋 Backup disponibili:"
ls -la "$BACKUP_DIR" | grep "^d" | grep "src_" | awk '{print "  - " $9}'

print_status "\n🔧 Per ripristinare un backup:"
print_status "   rm -rf src && cp -r $BACKUP_PATH src"