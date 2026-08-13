package com.messiasmoraes.frases;

import android.Manifest;
import android.app.DownloadManager;
import android.content.Context;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final int PEDIDO_PERMISSAO_ARMAZENAMENTO = 4102;
    private String urlPendente;
    private String nomeArquivoPendente;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WebView webView = getBridge().getWebView();
        webView.addJavascriptInterface(new AndroidDownloader(this), "AndroidDownloader");
    }

    /**
     * Salva uma URL pública de MP4 pelo DownloadManager do Android. O WebView
     * não trata links de Blob como um navegador completo, por isso o sistema
     * recebe a URL remota e grava o arquivo diretamente em Downloads.
     */
    private void baixarVideoNativamente(String url, String nomeArquivo) {
        if (url == null || url.trim().isEmpty()) return;

        Uri origem = Uri.parse(url);
        String esquema = origem.getScheme();
        if (!"https".equalsIgnoreCase(esquema) && !"http".equalsIgnoreCase(esquema)) return;

        if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.P
                && checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
            urlPendente = url;
            nomeArquivoPendente = nomeArquivo;
            requestPermissions(new String[]{Manifest.permission.WRITE_EXTERNAL_STORAGE}, PEDIDO_PERMISSAO_ARMAZENAMENTO);
            return;
        }

        enfileirarDownload(origem, nomeArquivo);
    }

    private void enfileirarDownload(Uri origem, String nomeArquivo) {
        String arquivo = normalizarNomeArquivo(nomeArquivo);
        DownloadManager.Request pedido = new DownloadManager.Request(origem);
        pedido.setTitle("Frases de Messias");
        pedido.setDescription("Baixando vídeo MP4");
        pedido.setMimeType("video/mp4");
        pedido.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
        pedido.setVisibleInDownloadsUi(true);
        pedido.setAllowedOverMetered(true);
        pedido.setAllowedOverRoaming(true);
        pedido.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, arquivo);

        DownloadManager gerenciador = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
        if (gerenciador != null) {
            gerenciador.enqueue(pedido);
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);

        if (requestCode == PEDIDO_PERMISSAO_ARMAZENAMENTO
                && grantResults.length > 0
                && grantResults[0] == PackageManager.PERMISSION_GRANTED
                && urlPendente != null) {
            Uri origem = Uri.parse(urlPendente);
            enfileirarDownload(origem, nomeArquivoPendente);
        }
        urlPendente = null;
        nomeArquivoPendente = null;
    }

    private String normalizarNomeArquivo(String nomeArquivo) {
        String arquivo = nomeArquivo == null ? "" : nomeArquivo.trim();
        arquivo = arquivo.replaceAll("[\\\\/:*?\"<>|]", "-");
        if (arquivo.isEmpty()) arquivo = "frases-de-messias-video.mp4";
        if (!arquivo.toLowerCase().endsWith(".mp4")) arquivo += ".mp4";
        return arquivo;
    }

    private static class AndroidDownloader {
        private final MainActivity activity;

        AndroidDownloader(MainActivity activity) {
            this.activity = activity;
        }

        @JavascriptInterface
        public void baixarVideo(String url, String nomeArquivo) {
            activity.runOnUiThread(() -> activity.baixarVideoNativamente(url, nomeArquivo));
        }
    }
}
