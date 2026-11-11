package io.github.heyb0ss.editaya

import android.content.ContentValues
import android.content.Intent
import android.net.Uri
import android.os.Environment
import android.provider.MediaStore
import android.util.Base64
import android.view.WindowManager
import android.webkit.JavascriptInterface
import java.io.OutputStream
import java.util.UUID

/**
 * Puente JS ⇄ Android expuesto como `window.AndroidBridge`.
 * El editor envía el video exportado en trozos base64 y aquí se escribe
 * en la galería (Movies/EditaYa) mediante MediaStore.
 */
class AndroidBridge(private val activity: MainActivity) {

    private class PendingSave(val uri: Uri, val out: OutputStream)

    private val saves = HashMap<String, PendingSave>()
    @Volatile private var lastUri: Uri? = null

    @JavascriptInterface
    fun beginSave(name: String, mime: String): String {
        return try {
            val resolver = activity.contentResolver
            val values = ContentValues().apply {
                put(MediaStore.Video.Media.DISPLAY_NAME, name)
                put(MediaStore.Video.Media.MIME_TYPE, mime.ifBlank { "video/mp4" })
                put(MediaStore.Video.Media.RELATIVE_PATH, Environment.DIRECTORY_MOVIES + "/EditaYa")
                put(MediaStore.Video.Media.IS_PENDING, 1)
            }
            val collection = MediaStore.Video.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
            val uri = resolver.insert(collection, values) ?: return ""
            val out = resolver.openOutputStream(uri) ?: run {
                resolver.delete(uri, null, null); return ""
            }
            val token = UUID.randomUUID().toString()
            synchronized(saves) { saves[token] = PendingSave(uri, out) }
            token
        } catch (e: Exception) {
            ""
        }
    }

    @JavascriptInterface
    fun appendChunk(token: String, base64: String): Boolean {
        val save = synchronized(saves) { saves[token] } ?: return false
        return try {
            save.out.write(Base64.decode(base64, Base64.DEFAULT)); true
        } catch (e: Exception) {
            abort(token); false
        }
    }

    @JavascriptInterface
    fun finishSave(token: String): String {
        val save = synchronized(saves) { saves.remove(token) } ?: return ""
        return try {
            save.out.flush(); save.out.close()
            val values = ContentValues().apply { put(MediaStore.Video.Media.IS_PENDING, 0) }
            activity.contentResolver.update(save.uri, values, null, null)
            lastUri = save.uri
            save.uri.toString()
        } catch (e: Exception) {
            activity.contentResolver.delete(save.uri, null, null); ""
        }
    }

    @JavascriptInterface
    fun shareLast(): Boolean {
        val uri = lastUri ?: return false
        activity.runOnUiThread {
            val send = Intent(Intent.ACTION_SEND).apply {
                type = "video/*"
                putExtra(Intent.EXTRA_STREAM, uri)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            activity.startActivity(Intent.createChooser(send, "Compartir video"))
        }
        return true
    }

    @JavascriptInterface
    fun keepScreenOn(on: Boolean) {
        activity.runOnUiThread {
            if (on) activity.window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
            else activity.window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        }
    }

    private fun abort(token: String) {
        val save = synchronized(saves) { saves.remove(token) } ?: return
        try { save.out.close() } catch (_: Exception) {}
        try { activity.contentResolver.delete(save.uri, null, null) } catch (_: Exception) {}
    }
}
