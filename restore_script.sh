#!/bin/bash

# Script di ripristino backup per Free to Smoke App
# Uso: ./restore_script.sh [nome_backup]

set -e

# Colori per output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
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

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Verifica che siamo nella directory corretta
if [ ! -f "package.json" ]; then
    print_error "Errore: package.json non trovato. Esegui lo script dalla root del progetto."
    exit 1
fi

BACKUP_DIR="backup"

# Se non viene specificato un backup, mostra quelli disponibili
if [ $# -eq 0 ]; then
    print_info "📋 Backup disponibili:"
    if [ -d "$BACKUP_DIR" ]; then
        ls -la "$BACKUP_DIR" | grep "^d" | grep "src_" | awk '{print "  - " $9}' | sed 's/src_//'
        echo
        print_info "🔧 Uso: ./restore_script.sh [nome_backup]"
        print_info "💡 Esempio: ./restore_script.sh stable_current"
    else
        print_error "Nessun backup trovato. Directory backup non esistente."
    fi
    exit 0
fi

BACKUP_NAME="$1"
BACKUP_PATH="$BACKUP_DIR/src_$BACKUP_NAME"

# Verifica che il backup esista
if [ ! -d "$BACKUP_PATH" ]; then
    print_error "Backup '$BACKUP_NAME' non trovato in $BACKUP_PATH"
    print_info "Backup disponibili:"
    ls -la "$BACKUP_DIR" | grep "^d" | grep "src_" | awk '{print "  - " $9}' | sed 's/src_//'
    exit 1
fi

# Mostra informazioni sul backup
if [ -f "$BACKUP_DIR/backup_$BACKUP_NAME.log" ]; then
    print_info "📄 Informazioni backup:"
    cat "$BACKUP_DIR/backup_$BACKUP_NAME.log" | sed 's/^/  /'
    echo
fi

# Conferma ripristino
print_warning "⚠️  ATTENZIONE: Questo sovrascriverà completamente la cartella src/ corrente!"
print_warning "📁 Backup da ripristinare: $BACKUP_NAME"
print_warning "📂 Percorso: $BACKUP_PATH"
echo
print_warning "Continuare? (y/N)"
read -r response
if [[ ! "$response" =~ ^[Yy]$ ]]; then
    print_error "Ripristino annullato."
    exit 1
fi

# Crea un backup di emergenza della versione corrente
print_status "Creando backup di emergenza della versione corrente..."
EMERGENCY_BACKUP="$BACKUP_DIR/src_emergency_$(date +%Y%m%d_%H%M%S)"
cp -r src "$EMERGENCY_BACKUP"
print_status "✅ Backup di emergenza creato: $EMERGENCY_BACKUP"

# Ripristina il backup
print_status "Ripristinando backup $BACKUP_NAME..."
rm -rf src
cp -r "$BACKUP_PATH" src

print_status "✅ Ripristino completato con successo!"
print_status "📁 Backup ripristinato: $BACKUP_NAME"
print_status "🆘 Backup di emergenza: $EMERGENCY_BACKUP"

# Suggerimenti post-ripristino
echo
print_info "🔄 Prossimi passi suggeriti:"
print_info "  1. Verifica che l'applicazione funzioni: npm run dev"
print_info "  2. Controlla le dipendenze: npm install"
print_info "  3. Se tutto ok, elimina il backup di emergenza"
print_info "  4. Se ci sono problemi, ripristina il backup di emergenza"