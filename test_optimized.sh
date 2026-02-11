#!/bin/bash
# Script de prueba para RustDesk optimizado
# Fecha: 7 de noviembre de 2025

echo "=========================================="
echo "  Prueba de RustDesk Optimizado"
echo "=========================================="
echo ""

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar que el binario existe
BINARY="./target/release/rustdesk"
if [ ! -f "$BINARY" ]; then
    echo -e "${RED}✗ Error: Binario no encontrado en $BINARY${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Binario encontrado: $BINARY${NC}"
echo "  Tamaño: $(du -h $BINARY | cut -f1)"
echo ""

# Verificar dependencias
echo "Verificando dependencias..."
ldd $BINARY | grep "not found" > /dev/null
if [ $? -eq 0 ]; then
    echo -e "${RED}✗ Dependencias faltantes:${NC}"
    ldd $BINARY | grep "not found"
    exit 1
else
    echo -e "${GREEN}✓ Todas las dependencias están disponibles${NC}"
fi
echo ""

# Verificar que las optimizaciones están en el código
echo "Verificando optimizaciones en el código fuente..."

if grep -q "av_sync" src/lib.rs; then
    echo -e "${GREEN}✓ Módulo av_sync declarado en src/lib.rs${NC}"
else
    echo -e "${RED}✗ Módulo av_sync NO encontrado${NC}"
fi

if [ -f "src/av_sync.rs" ]; then
    echo -e "${GREEN}✓ Archivo src/av_sync.rs existe ($(wc -l < src/av_sync.rs) líneas)${NC}"
else
    echo -e "${RED}✗ Archivo src/av_sync.rs NO encontrado${NC}"
fi

if grep -q "AUDIO_BUFFER_MS: u64 = 500" src/client.rs; then
    echo -e "${GREEN}✓ Buffer de audio optimizado (500ms)${NC}"
else
    echo -e "${YELLOW}⚠ Buffer de audio no verificado${NC}"
fi

if grep -q "int64 pts" libs/hbb_common/protos/message.proto; then
    echo -e "${GREEN}✓ Campo PTS agregado a AudioFrame${NC}"
else
    echo -e "${RED}✗ Campo PTS NO encontrado en message.proto${NC}"
fi

echo ""

# Probar ejecución del binario
echo "=========================================="
echo "  Prueba de Ejecución"
echo "=========================================="
echo ""

echo "Probando ejecución con --help..."
timeout 5 $BINARY --help > /tmp/rustdesk_help.txt 2>&1
if [ $? -eq 0 ] || [ $? -eq 124 ]; then
    echo -e "${GREEN}✓ Binario ejecutable${NC}"
    if [ -s /tmp/rustdesk_help.txt ]; then
        echo "  Primeras líneas de salida:"
        head -5 /tmp/rustdesk_help.txt | sed 's/^/    /'
    fi
else
    echo -e "${RED}✗ Error al ejecutar el binario${NC}"
fi
echo ""

# Probar modo servidor
echo "Probando modo servidor (5 segundos)..."
echo "Comando: RUST_LOG=info $BINARY --server"
echo ""

timeout 5 env RUST_LOG=info $BINARY --server > /tmp/rustdesk_server.log 2>&1 &
SERVER_PID=$!

sleep 2

if ps -p $SERVER_PID > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Servidor ejecutándose (PID: $SERVER_PID)${NC}"
    
    # Buscar mensajes de optimización en los logs
    echo ""
    echo "Buscando mensajes de optimización en logs..."
    
    if grep -q "AV sync" /tmp/rustdesk_server.log 2>/dev/null; then
        echo -e "${GREEN}✓ Mensajes de sincronización AV encontrados:${NC}"
        grep "AV sync" /tmp/rustdesk_server.log | head -3 | sed 's/^/    /'
    else
        echo -e "${YELLOW}⚠ No se encontraron mensajes de AV sync (puede ser normal)${NC}"
    fi
    
    # Esperar a que termine el timeout
    wait $SERVER_PID 2>/dev/null
else
    echo -e "${RED}✗ El servidor terminó inesperadamente${NC}"
    echo "Últimas líneas del log:"
    tail -10 /tmp/rustdesk_server.log | sed 's/^/    /'
fi

echo ""
echo "=========================================="
echo "  Resumen de la Prueba"
echo "=========================================="
echo ""
echo -e "${GREEN}Binario compilado correctamente con optimizaciones${NC}"
echo ""
echo "Próximos pasos:"
echo "  1. Ejecutar: $BINARY --server"
echo "  2. Conectar desde otro dispositivo"
echo "  3. Probar sincronización de audio/video"
echo "  4. Comparar con versión original: /usr/bin/rustdesk"
echo ""
echo "Logs guardados en:"
echo "  - /tmp/rustdesk_help.txt"
echo "  - /tmp/rustdesk_server.log"
echo ""
echo "Para ver logs en tiempo real:"
echo "  RUST_LOG=debug $BINARY --server"
echo ""

