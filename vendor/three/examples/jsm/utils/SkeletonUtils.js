// Minimal SkeletonUtils: GLTFLoader yalnızca `clone` işlevini içe aktarır. Resmi three.js dosyasındaki `clone` ile aynı mantık
// (iskeletli modelleri klonlarken kemikleri yeniden bağlar). İstenirse resmi dosyayla değiştirilebilir.
import { Matrix4 } from 'three';

function clone( source ) {
	const sourceLookup = new Map();
	const cloneLookup = new Map();
	const clone = source.clone();
	parallelTraverse( source, clone, function ( sourceNode, clonedNode ) {
		sourceLookup.set( clonedNode, sourceNode );
		cloneLookup.set( sourceNode, clonedNode );
	} );
	clone.traverse( function ( node ) {
		if ( ! node.isSkinnedMesh ) return;
		const clonedMesh = node;
		const sourceMesh = sourceLookup.get( node );
		const sourceBones = sourceMesh.skeleton.bones;
		clonedMesh.skeleton = sourceMesh.skeleton.clone();
		clonedMesh.bindMatrix.copy( sourceMesh.bindMatrix );
		clonedMesh.skeleton.bones = sourceBones.map( function ( bone ) {
			return cloneLookup.get( bone );
		} );
		clonedMesh.bind( clonedMesh.skeleton, clonedMesh.bindMatrix );
	} );
	return clone;
}

function parallelTraverse( a, b, callback ) {
	callback( a, b );
	for ( let i = 0; i < a.children.length; i ++ ) {
		parallelTraverse( a.children[ i ], b.children[ i ], callback );
	}
}

export { clone };
