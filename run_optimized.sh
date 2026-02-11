#!/bin/bash
# Script para ejecutar RustDesk optimizado
# Uso: ./run_optimized.sh [opciones]

BINARY="./target/release/rustdesk"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cd "$SCRIPT_DIR"

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=========================================="
echo "  RustDesk Optimizado"
echo "  Versión con sincronización AV mejorada"
echo -e "==========================================${NC}"
echo ""

# Verificar que el binario existe
if [ ! -f "$BINARY" ]; then
    echo -e "${YELLOW}⚠ Binario no encontrado. Compilando...${NC}"
    export VCPKG_ROOT=~/vcpkg
    export RUSTFLAGS="-L $PWD/vcpkg_installed/x64-linux/lib"
    cargo build --release
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}✗ Error en la compilación${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✓ Binario encontrado${NC}"
echo ""

# Mostrar opciones
if [ "$1" == "--help" ] || [ "$1" == "-h" ]; then
    echo "Uso: $0 [modo]"
    echo ""
    echo "Modos disponibles:"
    echo "  --server    Ejecutar como servidor (recomendado)"
    echo "  --debug     Ejecutar con logs de debug"
    echo "  --info      Ejecutar con logs de info"
    echo "  --help      Mostrar esta ayuda"
    echo ""
    echo "Sin argumentos: Ejecuta en modo normal"
    echo ""
    echo "Ejemplos:"
    echo "  $0 --server"
    echo "  $0 --debug"
    echo ""
    exit 0
fi

# Ejecutar según el modo
case "$1" in
    --server)
        echo -e "${GREEN}Ejecutando en modo servidor...${NC}"
        echo "Presiona Ctrl+C para detener"
        echo ""
        RUST_LOG=info $BINARY --server
        ;;
    --debug)
        echo -e "${GREEN}Ejecutando con logs de debug...${NC}"
        echo "Presiona Ctrl+C para detener"
        echo ""
        RUST_LOG=debug $BINARY --server
        ;;
    --info)
        echo -e "${GREEN}Ejecutando con logs de info...${NC}"
        echo "Presiona Ctrl+C para detener"
        echo ""
        RUST_LOG=info $BINARY
        ;;
    *)
        echo -e "${GREEN}Ejecutando RustDesk optimizado...${NC}"
        echo "Presiona Ctrl+C para detener"
        echo ""
        $BINARY
        ;;
esac

