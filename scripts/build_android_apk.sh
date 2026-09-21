#!/usr/bin/env bash
set -e

echo "=== 1. Checking build environment ==="
BUILD_DIR="/tmp/surge_apk_build"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR/gen" "$BUILD_DIR/obj" "$BUILD_DIR/bin" "$BUILD_DIR/assets/www" "$BUILD_DIR/src/com/surge/musicbase"

ANDROID_JAR="/opt/android-sdk/android.jar"
R8_JAR="/opt/android-sdk/r8.jar"
KEYSTORE="/opt/android-sdk/debug.keystore"

if [ ! -f "$ANDROID_JAR" ] || [ ! -f "$R8_JAR" ] || [ ! -f "$KEYSTORE" ]; then
    echo "ERROR: Android SDK components missing in /opt/android-sdk"
    exit 1
fi

echo "=== 2. Preparing Web Assets ==="
npm run build

cp -r dist/* "$BUILD_DIR/assets/www/"
# Remove server artifacts and apk binaries that aren't needed inside the APK web assets
rm -f "$BUILD_DIR/assets/www/server.cjs"*
rm -f "$BUILD_DIR/assets/www/"*.apk

echo "=== 3. Writing AndroidManifest.xml ==="
cat << 'EOF' > "$BUILD_DIR/AndroidManifest.xml"
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.surge.musicbase"
    android:versionCode="400"
    android:versionName="4.0.0">

    <uses-sdk android:minSdkVersion="24" android:targetSdkVersion="34" />

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />

    <application
        android:label="Surge Studio"
        android:icon="@mipmap/ic_launcher"
        android:hardwareAccelerated="true"
        android:theme="@style/NormalTheme">
        <activity
            android:name="com.surge.musicbase.MainActivity"
            android:exported="true"
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale"
            android:windowSoftInputMode="adjustResize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
EOF

echo "=== 4. Writing MainActivity.java ==="
cat << 'EOF' > "$BUILD_DIR/src/com/surge/musicbase/MainActivity.java"
package com.surge.musicbase;

import android.Manifest;
import android.app.Activity;
import android.content.pm.PackageManager;
import android.content.res.AssetManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.ConsoleMessage;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import java.io.InputStream;

public class MainActivity extends Activity {
    private static final int PERMISSION_REQUEST_CODE = 1001;
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            Window window = getWindow();
            window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
            window.setStatusBarColor(0xFF090D16);
            window.setNavigationBarColor(0xFF090D16);
        }

        webView = new WebView(this);
        setContentView(webView);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED ||
                checkSelfPermission(Manifest.permission.MODIFY_AUDIO_SETTINGS) != PackageManager.PERMISSION_GRANTED) {
                requestPermissions(new String[]{
                    Manifest.permission.RECORD_AUDIO,
                    Manifest.permission.MODIFY_AUDIO_SETTINGS,
                    Manifest.permission.VIBRATE
                }, PERMISSION_REQUEST_CODE);
            }
        }

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setAllowUniversalAccessFromFileURLs(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setSupportZoom(false);
        
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
        webView.setBackgroundColor(0xFF090D16);

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        request.grant(request.getResources());
                    }
                });
            }

            @Override
            public boolean onConsoleMessage(ConsoleMessage cm) {
                android.util.Log.d("SurgeStudio", cm.message() + " -- Line: " + cm.lineNumber());
                return true;
            }
        });

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String path = uri.getPath();
                if (path == null || path.isEmpty() || path.equals("/")) {
                    path = "/index.html";
                }
                if (path.startsWith("/")) {
                    path = path.substring(1);
                }
                
                try {
                    String assetPath = "www/" + path;
                    AssetManager am = getAssets();
                    InputStream stream = am.open(assetPath);
                    String mimeType = getMimeType(path);
                    return new WebResourceResponse(mimeType, "UTF-8", stream);
                } catch (Exception e) {
                    try {
                        InputStream indexStream = getAssets().open("www/index.html");
                        return new WebResourceResponse("text/html", "UTF-8", indexStream);
                    } catch (Exception ex) {
                        return null;
                    }
                }
            }

            private String getMimeType(String path) {
                if (path.endsWith(".html")) return "text/html";
                if (path.endsWith(".js") || path.endsWith(".mjs")) return "application/javascript";
                if (path.endsWith(".css")) return "text/css";
                if (path.endsWith(".json")) return "application/json";
                if (path.endsWith(".png")) return "image/png";
                if (path.endsWith(".svg")) return "image/svg+xml";
                if (path.endsWith(".wav")) return "audio/wav";
                if (path.endsWith(".mp3")) return "audio/mpeg";
                if (path.endsWith(".wasm")) return "application/wasm";
                return "application/octet-stream";
            }
        });

        webView.loadUrl("https://localhost/index.html");
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (webView != null) webView.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) webView.onResume();
    }
}
EOF

echo "=== 5. Compiling Android Resources with aapt ==="
aapt package -f -m \
    -J "$BUILD_DIR/gen" \
    -M "$BUILD_DIR/AndroidManifest.xml" \
    -S android/app/src/main/res \
    -I "$ANDROID_JAR"

echo "=== 6. Compiling Java Source ==="
javac -d "$BUILD_DIR/obj" \
    -cp "$ANDROID_JAR:$BUILD_DIR/gen" \
    "$BUILD_DIR/gen/com/surge/musicbase/R.java" \
    "$BUILD_DIR/src/com/surge/musicbase/MainActivity.java"

echo "=== 7. Converting Classes to Dalvik Executable (D8) ==="
java -cp "$R8_JAR" com.android.tools.r8.D8 \
    --lib "$ANDROID_JAR" \
    --output "$BUILD_DIR/bin" \
    $(find "$BUILD_DIR/obj" -name "*.class")

echo "=== 8. Packaging Resources and Assets with aapt ==="
aapt package -f \
    -M "$BUILD_DIR/AndroidManifest.xml" \
    -S android/app/src/main/res \
    -A "$BUILD_DIR/assets" \
    -I "$ANDROID_JAR" \
    -F "$BUILD_DIR/bin/unaligned.apk"

echo "=== 9. Adding classes.dex into APK ==="
(cd "$BUILD_DIR/bin" && aapt add unaligned.apk classes.dex)

echo "=== 10. Zipaligning APK ==="
zipalign -f -p 4 "$BUILD_DIR/bin/unaligned.apk" "$BUILD_DIR/bin/aligned.apk"

echo "=== 11. Signing APK with Apksigner ==="
apksigner sign \
    --ks "$KEYSTORE" \
    --ks-pass pass:android \
    --ks-key-alias androiddebugkey \
    --out "$BUILD_DIR/SurgeStudio.apk" \
    "$BUILD_DIR/bin/aligned.apk"

echo "=== 12. Verifying Signature ==="
apksigner verify --verbose "$BUILD_DIR/SurgeStudio.apk"

echo "=== 13. Copying APK to Explorer and Public Distribution ==="
mkdir -p apk
cp "$BUILD_DIR/SurgeStudio.apk" ./SurgeStudio.apk
cp "$BUILD_DIR/SurgeStudio.apk" ./apk/SurgeStudio.apk
cp "$BUILD_DIR/SurgeStudio.apk" public/SurgeStudio.apk
mkdir -p dist
cp "$BUILD_DIR/SurgeStudio.apk" dist/SurgeStudio.apk

echo "APK Built Successfully!"
ls -lh SurgeStudio.apk
